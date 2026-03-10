import express from 'express';
import { toggleMuteUser, getMutedUsers, checkMuteStatus } from '../controllers/muteController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.put('/:federatedId/toggle', verifyToken, toggleMuteUser);
router.get('/:federatedId/status', verifyToken, checkMuteStatus);
router.get('/', verifyToken, getMutedUsers);

export default router;
