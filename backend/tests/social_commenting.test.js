import request from 'supertest';
import { jest } from '@jest/globals';

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

const postService = await import('../services/postService.js');
const { createTestApp, generateToken } = await import('./testApp.js');
const Post = (await import('../models/Post.js')).default;

describe('Commenting API', () => {
    let app;
    let token;
    const testUser = {
        federatedId: 'tester@local.server',
        displayName: 'Tester',
        serverName: 'local.server',
        role: 'user'
    };

    beforeAll(async () => {
        app = await createTestApp();
        token = generateToken(testUser);
        process.env.SERVER_NAME = 'local.server';
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PUT /api/posts/comment', () => {
        let post;

        beforeEach(async () => {
            post = await Post.create({
                description: 'Post to comment on',
                federatedId: 'tester@local.server/post/999',
                originServer: 'local.server',
                serverName: 'local.server'
            });
        });

        it('should add a comment successfully', async () => {
            postService.addCommentService.mockResolvedValue();

            const res = await request(app)
                .put('/api/posts/comment')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    postFederatedId: post.federatedId,
                    content: 'Nice post!'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.commentFederatedId).toBeDefined();
            expect(postService.addCommentService).toHaveBeenCalled();
        });

        it('should reject empty comments', async () => {
            const res = await request(app)
                .put('/api/posts/comment')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    postFederatedId: post.federatedId,
                    content: '   '
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('content is required');
        });
    });
});