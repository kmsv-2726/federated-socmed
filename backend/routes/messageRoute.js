import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { getMessages, sendMessage, getChatHistoryUsers } from '../controllers/messageController.js';

const router = express.Router();

// Get list of users the current user has chatted with
router.get('/users', verifyToken, getChatHistoryUsers);

// Get messages with a specific user
router.get('/:targetUserId', verifyToken, getMessages);

// Send a new message via POST API
router.post('/', verifyToken, sendMessage);

export default router;
