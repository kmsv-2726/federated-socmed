import request from 'supertest';
import { createTestApp, generateToken } from './testApp.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

describe('Messaging API', () => {
    let app;
    let token;
    let sender;
    let receiver;

    beforeAll(async () => {
        app = createTestApp();

        // Setup users
        sender = await User.create({
            displayName: 'Sender',
            firstName: 'S',
            lastName: 'User',
            dob: new Date(),
            email: 'sender@test.com',
            password: 'hashed',
            serverName: 'local.server',
            originServer: 'local.server',
            federatedId: 'sender@local.server'
        });

        receiver = await User.create({
            displayName: 'Receiver',
            firstName: 'R',
            lastName: 'User',
            dob: new Date(),
            email: 'receiver@test.com',
            password: 'hashed',
            serverName: 'local.server',
            originServer: 'local.server',
            federatedId: 'receiver@local.server'
        });

        token = generateToken({
            userId: sender._id.toString(),
            federatedId: sender.federatedId,
            displayName: sender.displayName,
            serverName: sender.serverName
        });
    });

    describe('POST /api/messages', () => {
        it('should send a direct message successfully', async () => {
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    receiverId: receiver._id.toString(),
                    messageText: 'Private hello'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message.message).toBe('Private hello');
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
            expect(res.body.users).toBeDefined();
            // Since we just sent a message, receiver should be in the list
            expect(res.body.users.some(u => u._id === receiver._id.toString())).toBe(true);
        });
    });
});
