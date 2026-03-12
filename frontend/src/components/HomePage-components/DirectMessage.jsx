import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { FiX, FiSend, FiUser } from 'react-icons/fi';
import '../../styles/DirectMessage.css';

import { getApiBaseUrl } from '../../config/api';

const API_BASE_URL = getApiBaseUrl();
const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace("/api", "") : "http://localhost:5000");

const DirectMessage = ({ onClose, initialTargetUser = null }) => {
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Contacts and chats
    const [contacts, setContacts] = useState([]);
    const [activeChatUser, setActiveChatUser] = useState(initialTargetUser);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [blockInfo, setBlockInfo] = useState({ isBlocked: false, details: null });

    // Search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const messagesEndRef = useRef(null);

    const handleProfileClick = (user) => {
        if (!user.federatedId) return;
        onClose(); // Close the DM window
        navigate(`/user/${encodeURIComponent(user.federatedId)}`);
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);

            // Initialize Socket connection
            const newSocket = io(SOCKET_URL);
            setSocket(newSocket);

            newSocket.emit('register', user._id || user.id);

            newSocket.on('newMessage', (msg) => {
                setMessages((prev) => [...prev, msg]);
            });

            return () => newSocket.close();
        }
    }, []);

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        if (activeChatUser) {
            fetchMessages(activeChatUser._id || activeChatUser.id);
            checkBlockStatus(activeChatUser.federatedId || activeChatUser._id || activeChatUser.id);
        }
    }, [activeChatUser]);

    const checkBlockStatus = async (targetId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/blocks/${encodeURIComponent(targetId)}/check-both`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setBlockInfo({ isBlocked: res.data.isBlocked, details: res.data.details });
            }
        } catch (err) {
            console.error('Error checking block status:', err);
        }
    };

    useEffect(() => {
        // Auto-scroll to bottom of messages
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchContacts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/messages/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setContacts(res.data.users);
            }
        } catch (err) {
            console.error('Error fetching chat history users:', err);
        }
    };

    const fetchMessages = async (targetId) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/messages/${targetId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setMessages(res.data.messages);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length === 0) {
            setSearchResults([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/user?search=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                // Filter out current user from search
                const currentUserId = currentUser?._id || currentUser?.id;
                setSearchResults(res.data.users.filter(u => (u._id || u.id) !== currentUserId));
            }
        } catch (err) {
            console.error('Error searching users:', err);
        }
    };

    const selectUser = (user) => {
        setActiveChatUser(user);
        setSearchQuery('');
        setSearchResults([]);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChatUser) return;

        try {
            const token = localStorage.getItem('token');
            const targetId = activeChatUser._id || activeChatUser.id;

            const res = await axios.post(`${API_BASE_URL}/messages`, {
                receiverId: targetId,
                messageText: newMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setMessages(prev => [...prev, res.data.message]);
                setNewMessage('');

                // Add to contacts if not already there
                if (!contacts.some(c => c._id === targetId)) {
                    setContacts(prev => [activeChatUser, ...prev]);
                }
            }
        } catch (err) {
            console.error('Error sending message:', err);
        }
    };

    return (
        <div className="dm-overlay">
            <div className="dm-container">

                {/* Left Panel: Contacts & Search */}
                <div className="dm-sidebar">
                    <div className="dm-header">
                        <h3>Messages</h3>
                        <button className="close-btn" onClick={onClose}><FiX size={20} /></button>
                    </div>

                    <div className="dm-search">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map(user => (
                                    <div key={user._id} className="search-user-item" onClick={() => selectUser(user)}>
                                        <div
                                            className="user-avatar-sm clickable"
                                            onClick={(e) => { e.stopPropagation(); handleProfileClick(user); }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {user.profilePicture ? <img src={user.profilePicture} alt="" /> : <FiUser />}
                                        </div>
                                        <span>{user.username}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="dm-contacts">
                        {contacts.length === 0 && !searchQuery && (
                            <p className="no-contacts">No recent chats.</p>
                        )}
                        {contacts.map(user => (
                            <div
                                key={user._id}
                                className={`contact-item ${activeChatUser?._id === user._id ? 'active' : ''}`}
                                onClick={() => selectUser(user)}
                            >
                                <div
                                    className="user-avatar-sm clickable"
                                    onClick={(e) => { e.stopPropagation(); handleProfileClick(user); }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {user.profilePicture ? <img src={user.profilePicture} alt="" /> : <FiUser />}
                                </div>
                                <span className="contact-name">{user.username}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Chat Area */}
                <div className="dm-chat-area">
                    {activeChatUser ? (
                        <>
                            <div className="chat-header">
                                <div
                                    className="user-avatar-sm clickable"
                                    onClick={() => handleProfileClick(activeChatUser)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {activeChatUser.profilePicture ? <img src={activeChatUser.profilePicture} alt="" /> : <FiUser />}
                                </div>
                                <strong
                                    className="clickable"
                                    onClick={() => handleProfileClick(activeChatUser)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {activeChatUser.username}
                                </strong>
                                {activeChatUser.serverName && <span className="server-tag">@{activeChatUser.serverName}</span>}
                            </div>

                            <div className="chat-messages">
                                {loading ? <p className="loading-msg">Loading...</p> : null}

                                {messages.length === 0 && !loading && !blockInfo.isBlocked && (
                                    <p className="empty-chat">No messages yet. Say hi!</p>
                                )}

                                {blockInfo.isBlocked && (
                                    <p className="blocked-msg">
                                        {blockInfo.details === 'you_blocked'
                                            ? 'You have blocked this user. Unblock them to send messages.'
                                            : 'Communication with this user is restricted.'}
                                    </p>
                                )}

                                {messages.map((msg, idx) => {
                                    const isMine = msg.sender === (currentUser?._id || currentUser?.id);
                                    return (
                                        <div key={idx} className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                            {msg.message}
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input-area" onSubmit={sendMessage}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={blockInfo.isBlocked ? "Messaging is disabled" : "Type a message..."}
                                    disabled={blockInfo.isBlocked}
                                />
                                <button type="submit" disabled={!newMessage.trim() || blockInfo.isBlocked}>
                                    <FiSend />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="empty-chat-area">
                            <FiUser size={48} color="#ccc" />
                            <p>Select a user to start messaging</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default DirectMessage;
