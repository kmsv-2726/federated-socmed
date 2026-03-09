import Message from '../models/Message.js';
import User from '../models/User.js';
import { io, onlineUsers } from '../index.js';

// Get message history between current user and target user
export const getMessages = async (req, res, next) => {
    try {
        const { targetUserId } = req.params;
        const currentUserId = req.user.id; // from verifyToken

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json({ success: true, messages });
    } catch (err) {
        next(err);
    }
};

// Send a message via HTTP
export const sendMessage = async (req, res, next) => {
    try {
        const { receiverId, messageText } = req.body;
        const senderId = req.user.id;

        if (!receiverId || !messageText) {
            return res.status(400).json({ success: false, message: 'Receiver and message text are required' });
        }

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            message: messageText
        });

        await newMessage.save();

        // Broadcast to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', newMessage);
        }

        res.status(201).json({ success: true, message: newMessage });
    } catch (err) {
        next(err);
    }
};

// Get a list of users the current user has chatted with
export const getChatHistoryUsers = async (req, res, next) => {
    try {
        const currentUserId = req.user.id;

        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }]
        }).populate('sender receiver', 'username profilePicture serverName');

        const usersMap = new Map();

        messages.forEach(msg => {
            const otherUser = msg.sender._id.toString() === currentUserId
                ? msg.receiver
                : msg.sender;

            if (!usersMap.has(otherUser._id.toString())) {
                usersMap.set(otherUser._id.toString(), otherUser);
            }
        });

        res.status(200).json({ success: true, users: Array.from(usersMap.values()) });
    } catch (err) {
        next(err);
    }
};
