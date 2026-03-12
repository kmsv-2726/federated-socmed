import Express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import {
    getPublicKey,
    addTrustedServer,
    getTrustedServers,
    removeTrustedServer,
    toggleTrustedServer
} from '../controllers/federationController.js';
import { verifyFederationRequest } from '../middleware/verifyFederationRequest.js';
import { federationInbox } from '../controllers/federationInboxController.js';
import { verifyFederatedServer } from '../middleware/verifyFederatedServer.js';
import { federationFeed } from '../controllers/federationFeedController.js';

const router = Express.Router();

// Public / Inbox / Feed
router.get("/public-key", getPublicKey);
router.post("/inbox", verifyFederationRequest, federationInbox);
router.get("/feed", verifyFederatedServer, federationFeed);

// Trusted Server Management (Admin Only)
router.post("/trusted-servers", verifyToken, verifyAdmin, addTrustedServer);
router.get("/trusted-servers", verifyToken, verifyAdmin, getTrustedServers);
router.put("/trusted-servers/:id/toggle", verifyToken, verifyAdmin, toggleTrustedServer);
router.delete("/trusted-servers/:id", verifyToken, verifyAdmin, removeTrustedServer);

import { getFederationStatus, toggleFederationStatus } from '../controllers/federationController.js';
router.get("/status", verifyToken, verifyAdmin, getFederationStatus);
router.put("/status", verifyToken, verifyAdmin, toggleFederationStatus);


export default router;   
