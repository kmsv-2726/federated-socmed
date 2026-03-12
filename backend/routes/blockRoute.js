import express from 'express';
import { toggleBlockUser, getBlockedUsers, checkBlockStatus, checkBothBlocks } from '../controllers/blockController.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.put('/:federatedId/toggle', verifyToken, toggleBlockUser);
router.get('/:federatedId/status', verifyToken, checkBlockStatus);
router.get('/:federatedId/check-both', verifyToken, checkBothBlocks);
router.get('/', verifyToken, getBlockedUsers);

export default router;
