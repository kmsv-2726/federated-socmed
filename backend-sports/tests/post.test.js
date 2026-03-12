import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import Post from '../models/Post.js';
import Channel from '../models/Channel.js';
import { createPost, getPosts, deletePost, likePost } from '../controllers/postController.js';
import { verifyToken } from '../middleware/verifyToken.js';

// Create a test Express app
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Mock auth middleware for testing
    app.use((req, res, next) => {
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, 'test-secret');
                req.user = decoded;
            } catch (err) {
                return res.status(401).json({ message: 'Authentication failed' });
            }
        }
        next();
    });

    // Routes
    app.post('/api/posts', createPost);
    app.get('/api/posts', getPosts);
    app.delete('/api/posts/:id', deletePost);
    app.put('/api/posts/like/:id', likePost);

    // Error handler
    app.use((err, req, res, next) => {
        const status = err.status || 500;
        const message = err.message || 'Something went wrong';
        res.status(status).json({ success: false, message });
    });

    return app;
};

// Generate test token
const generateToken = (userData) => {
    return jwt.sign(userData, 'test-secret', { expiresIn: '1h' });
};

describe('Post Creation API', () => {
    let app;
    let authToken;
    const testUser = {
        federatedId: 'testuser@food.server',
        displayName: 'Test User',
        server: 'food.server',
        role: 'user'
    };

    beforeAll(() => {
        app = createTestApp();
        authToken = generateToken(testUser);
    });

    describe('POST /api/posts - Create Post', () => {
        it('should create a user post successfully', async () => {
            const postData = {
                description: 'This is a test post',
                isChannelPost: false
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.post).toBeDefined();
            expect(response.body.post.description).toBe('This is a test post');
            expect(response.body.post.isUserPost).toBe(true);
            expect(response.body.post.userDisplayName).toBe('Test User');
        });

        it('should fail when description is missing', async () => {
            const postData = {
                isChannelPost: false
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('description is required');
        });

        it('should fail when description is empty', async () => {
            const postData = {
                description: '   ',
                isChannelPost: false
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should create a post with an image', async () => {
            const postData = {
                description: 'Post with image',
                image: 'https://example.com/image.jpg',
                isChannelPost: false
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.post.image).toBe('https://example.com/image.jpg');
        });

        it('should create a channel post when channel exists', async () => {
            // First create a channel
            const channel = new Channel({
                name: 'test-channel',
                description: 'Test channel',
                rules: ['Be nice'],
                visibility: 'public',
                federatedId: 'test-channel@food.server',
                originServer: 'food.server',
                serverName: 'food.server',
                createdBy: 'admin@food.server'
            });
            await channel.save();

            const postData = {
                description: 'This is a channel post',
                isChannelPost: true,
                channelName: 'test-channel'
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.post.isChannelPost).toBe(true);
            expect(response.body.post.channelName).toBe('test-channel');
        });

        it('should fail channel post when channel does not exist', async () => {
            const postData = {
                description: 'Post to non-existent channel',
                isChannelPost: true,
                channelName: 'non-existent-channel'
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Channel not found');
        });

        it('should fail channel post when channelName is missing', async () => {
            const postData = {
                description: 'Channel post without channel name',
                isChannelPost: true
            };

            const response = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(postData);

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Channel name is required');
        });
    });

    describe('GET /api/posts - Get Posts', () => {
        it('should return all posts', async () => {
            // Create some test posts
            await Post.create({
                description: 'Post 1',
                isUserPost: true,
                userDisplayName: 'User 1',
                federatedId: 'user1@server/post/1',
                originServer: 'server',
                serverName: 'server'
            });
            await Post.create({
                description: 'Post 2',
                isUserPost: true,
                userDisplayName: 'User 2',
                federatedId: 'user2@server/post/2',
                originServer: 'server',
                serverName: 'server'
            });

            const response = await request(app)
                .get('/api/posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.posts).toHaveLength(2);
        });

        it('should return posts sorted by newest first', async () => {
            await Post.create({
                description: 'Older post',
                isUserPost: true,
                userDisplayName: 'User',
                federatedId: 'user@server/post/1',
                originServer: 'server',
                serverName: 'server',
                createdAt: new Date('2024-01-01')
            });
            await Post.create({
                description: 'Newer post',
                isUserPost: true,
                userDisplayName: 'User',
                federatedId: 'user@server/post/2',
                originServer: 'server',
                serverName: 'server',
                createdAt: new Date('2024-01-02')
            });

            const response = await request(app)
                .get('/api/posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.posts[0].description).toBe('Newer post');
        });
    });

    describe('DELETE /api/posts/:id - Delete Post', () => {
        it('should delete a post successfully', async () => {
            const post = await Post.create({
                description: 'Post to delete',
                isUserPost: true,
                userDisplayName: 'Test User',
                federatedId: 'testuser@server/post/1',
                originServer: 'server',
                serverName: 'server'
            });

            const response = await request(app)
                .delete(`/api/posts/${post._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('deleted successfully');

            // Verify post is deleted
            const deletedPost = await Post.findById(post._id);
            expect(deletedPost).toBeNull();
        });

        it('should return 404 for non-existent post', async () => {
            const fakeId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .delete(`/api/posts/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Post not found');
        });
    });

    describe('PUT /api/posts/like/:id - Like Post', () => {
        it('should like a post', async () => {
            const post = await Post.create({
                description: 'Post to like',
                isUserPost: true,
                userDisplayName: 'Test User',
                federatedId: 'testuser@server/post/1',
                originServer: 'server',
                serverName: 'server',
                likeCount: 0,
                likedBy: []
            });

            const response = await request(app)
                .put(`/api/posts/like/${post._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.liked).toBe(true);
            expect(response.body.likeCount).toBe(1);
        });

        it('should unlike a post if already liked', async () => {
            const post = await Post.create({
                description: 'Post already liked',
                isUserPost: true,
                userDisplayName: 'Test User',
                federatedId: 'testuser@server/post/1',
                originServer: 'server',
                serverName: 'server',
                likeCount: 1,
                likedBy: ['testuser@food.server']
            });

            const response = await request(app)
                .put(`/api/posts/like/${post._id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.liked).toBe(false);
            expect(response.body.likeCount).toBe(0);
        });
    });
});
