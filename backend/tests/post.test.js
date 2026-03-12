import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// --- Mocks (MUST be before any imports that use them) ---
jest.unstable_mockModule('../services/postService.js', () => ({
    createPostService: jest.fn(),
    deletePostService: jest.fn(),
    toggleLikePostService: jest.fn(),
    addCommentService: jest.fn(),
    getPostsByIdsService: jest.fn()
}));

jest.unstable_mockModule('../services/federationService.js', () => ({
    sendFederationEvent: jest.fn()
}));

// --- Imports after mocking ---
const postService = await import('../services/postService.js');
const { createPost, getPosts, deletePost, likePost } = await import('../controllers/postController.js');
const Post = (await import('../models/Post.js')).default;
const Channel = (await import('../models/Channel.js')).default;

const TEST_SECRET = 'test-secret';

const createTestApp = () => {
    const app = express();
    app.use(express.json());

    app.use((req, res, next) => {
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, TEST_SECRET);
                req.user = decoded;
            } catch (err) {
                return res.status(401).json({ message: 'Authentication failed' });
            }
        }
        next();
    });

    app.post('/api/posts', createPost);
    app.get('/api/posts', getPosts);
    app.delete('/api/posts/:id', deletePost);
    app.put('/api/posts/like/', likePost);

    app.use((err, req, res, next) => {
        res.status(err.status || 500).json({ success: false, message: err.message || 'Something went wrong' });
    });

    return app;
};

const generateToken = (userData) => jwt.sign(userData, TEST_SECRET, { expiresIn: '1h' });

describe('Post Creation API', () => {
    let app;
    let authToken;
    const testUser = {
        federatedId: 'testuser@food.server',
        displayName: 'Test User',
        serverName: 'food.server',
        role: 'user'
    };

    beforeAll(() => {
        app = createTestApp();
        authToken = generateToken(testUser);
        process.env.SERVER_NAME = 'food.server';
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/posts - Create Post', () => {
        it('should create a user post successfully', async () => {
            postService.createPostService.mockResolvedValue({
                description: 'This is a test post',
                isUserPost: true,
                userDisplayName: 'Test User'
            });

            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ description: 'This is a test post', isChannelPost: false });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(postService.createPostService).toHaveBeenCalled();
        });

        it('should fail when description is missing', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ isChannelPost: false });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('description is required');
        });

        it('should fail when description is empty', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ description: '   ', isChannelPost: false });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should create a post with an image', async () => {
            postService.createPostService.mockResolvedValue({
                description: 'Post with image',
                image: 'https://example.com/image.jpg'
            });

            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ description: 'Post with image', image: 'https://example.com/image.jpg', isChannelPost: false });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('should create a channel post when channel exists', async () => {
            await Channel.create({
                name: 'test-channel',
                description: 'Test channel',
                rules: ['Be nice'],
                visibility: 'public',
                federatedId: 'test-channel@food.server',
                originServer: 'food.server',
                serverName: 'food.server',
                createdBy: 'admin@food.server'
            });

            postService.createPostService.mockResolvedValue({
                isChannelPost: true,
                channelName: 'test-channel'
            });

            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ description: 'Channel post', isChannelPost: true, channelName: 'test-channel' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('should fail channel post when channel does not exist', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ description: 'Post to non-existent channel', isChannelPost: true, channelName: 'non-existent-channel' });

            expect(res.status).toBe(404);
            expect(res.body.message).toContain('Channel not found');
        });

        it('should fail channel post when channelName is missing', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ description: 'Channel post without channel name', isChannelPost: true });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Channel name is required');
        });
    });

    describe('GET /api/posts - Get Posts', () => {
        it('should return all posts', async () => {
            await Post.create({ description: 'Post 1', isUserPost: true, userDisplayName: 'User 1', federatedId: 'user1@food.server/post/1', originServer: 'food.server', serverName: 'food.server' });
            await Post.create({ description: 'Post 2', isUserPost: true, userDisplayName: 'User 2', federatedId: 'user2@food.server/post/2', originServer: 'food.server', serverName: 'food.server' });

            const res = await request(app)
                .get('/api/posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.posts).toHaveLength(2);
        });

        it('should return posts sorted by newest first', async () => {
            await Post.create({ description: 'Older post', isUserPost: true, userDisplayName: 'User', federatedId: 'user@food.server/post/1', originServer: 'food.server', serverName: 'food.server', createdAt: new Date('2024-01-01') });
            await Post.create({ description: 'Newer post', isUserPost: true, userDisplayName: 'User', federatedId: 'user@food.server/post/2', originServer: 'food.server', serverName: 'food.server', createdAt: new Date('2024-01-02') });

            const res = await request(app)
                .get('/api/posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.posts[0].description).toBe('Newer post');
        });
    });

    describe('DELETE /api/posts/:id - Delete Post', () => {
        it('should delete a post successfully', async () => {
            const post = await Post.create({
                description: 'Post to delete',
                isUserPost: true,
                userDisplayName: 'Test User',
                authorFederatedId: 'testuser@food.server',
                federatedId: 'testuser@food.server/post/del1',
                originServer: 'food.server',
                serverName: 'food.server'
            });

            postService.deletePostService.mockResolvedValue();

            const res = await request(app)
                .delete(`/api/posts/${post._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('deleted successfully');
        });

        it('should return 404 for non-existent post', async () => {
            const res = await request(app)
                .delete('/api/posts/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/posts/like/ - Like Post', () => {
        it('should like a post', async () => {
            const post = await Post.create({
                description: 'Post to like',
                isUserPost: true,
                userDisplayName: 'Test User',
                authorFederatedId: 'testuser@food.server',
                federatedId: 'testuser@food.server/post/like1',
                originServer: 'food.server',
                serverName: 'food.server',
                likeCount: 0,
                likedBy: []
            });

            postService.toggleLikePostService.mockResolvedValue({ liked: true, likeCount: 1 });

            const res = await request(app)
                .put('/api/posts/like/')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ postFederatedId: post.federatedId });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(postService.toggleLikePostService).toHaveBeenCalled();
        });
    });
});