import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock verifyToken BEFORE importing the message route
jest.unstable_mockModule('../middleware/verifyToken.js', () => ({
    verifyToken: (req, res, next) => next()
}));

// Mock index.js to prevent circular dependency and mongoose connect issues
jest.unstable_mockModule('../index.js', () => ({
    io: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
    },
    onlineUsers: new Map()
}));

const TEST_SECRET = 'test-secret';

const generateToken = (userData) => jwt.sign(userData, TEST_SECRET, { expiresIn: '1h' });

// Build a minimal express app with just the message route
const createMessagingApp = async () => {
    const app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                req.user = jwt.verify(token, TEST_SECRET);
            } catch {
                return res.status(401).json({ message: 'Authentication failed' });
            }
        }
        next();
    });

    const messageRoute = (await import('../routes/messageRoute.js')).default;
    app.use('/api/messages', messageRoute);

    app.use((err, req, res, next) => {
        res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
    });

    return app;
};

const User = (await import('../models/User.js')).default;

describe('Messaging API', () => {
    let app;
    let token;
    let sender;
    let receiver;

    beforeAll(async () => {
        app = await createMessagingApp();

        sender = await User.create({
            displayName: 'Sender',
            firstName: 'SenderFirst',
            lastName: 'SenderLast',
            dob: '1990-01-01',
            email: 'sender@test.com',
            password: 'hashed',
            federatedId: 'Sender@TestServer',
            serverName: 'TestServer',
            originServer: 'TestServer',
            isRemote: false
        });

        receiver = await User.create({
            displayName: 'Receiver',
            firstName: 'ReceiverFirst',
            lastName: 'ReceiverLast',
            dob: '1990-01-01',
            email: 'receiver@test.com',
            password: 'hashed',
            federatedId: 'Receiver@TestServer',
            serverName: 'TestServer',
            originServer: 'TestServer',
            isRemote: false
        });

        token = generateToken({
            userId: sender._id.toString(),
            federatedId: sender.federatedId,
            displayName: sender.displayName,
            serverName: 'TestServer',
            role: 'user'
        });

        process.env.SERVER_NAME = 'TestServer';
    });

    describe('POST /api/messages', () => {
        it('should send a direct message successfully', async () => {
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    receiverId: receiver._id.toString(),
                    messageText: 'Hello!'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message.message).toBe('Hello!');
        });

        it('should fail if message text is missing', async () => {
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({ receiverId: receiver._id.toString() });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/messages/users', () => {
        it('should return chat history users', async () => {
            const res = await request(app)
                .get('/api/messages/users')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
        });
    });
});