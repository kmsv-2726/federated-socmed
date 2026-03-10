import request from 'supertest';
import { createTestApp, generateToken } from './testApp.js';
import Post from '../models/Post.js';
import Channel from '../models/Channel.js';

describe('Posting API', () => {
    let app;
    let token;
    const testUser = {
        federatedId: 'tester@local.server',
        displayName: 'Tester',
        serverName: 'local.server',
        role: 'user'
    };

    beforeAll(() => {
        app = createTestApp();
        token = generateToken(testUser);
    });

    describe('POST /api/posts', () => {
        it('should create a basic post successfully', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Hello world' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.post.description).toBe('Hello world');
        });

        it('should support multiple images (up to 4)', async () => {
            const images = ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg'];
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    description: 'Gallery post',
                    images: images
                });

            expect(res.status).toBe(201);
            expect(res.body.post.images).toHaveLength(4);
        });

        it('should reject more than 4 images', async () => {
            const images = ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg'];
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    description: 'Too many images',
                    images: images
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should create a channel post', async () => {
            // Setup channel
            await Channel.create({
                name: 'test-room',
                visibility: 'public',
                federatedId: 'test-room@local.server',
                originServer: 'local.server',
                serverName: 'local.server',
                createdBy: 'admin@local.server'
            });

            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    description: 'Channel post content',
                    isChannelPost: true,
                    channelName: 'test-room'
                });

            expect(res.status).toBe(201);
            expect(res.body.post.channelName).toBe('test-room');
            expect(res.body.post.isChannelPost).toBe(true);
        });
    });
});
