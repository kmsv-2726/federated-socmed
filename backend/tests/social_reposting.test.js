import request from 'supertest';
import { jest } from '@jest/globals';

// Mock verifyToken BEFORE importing testApp/routes
jest.unstable_mockModule('../middleware/verifyToken.js', () => ({
    verifyToken: (req, res, next) => next()
}));

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

describe('Reposting API', () => {
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

    describe('POST /api/posts/repost', () => {
        let originalPost;

        beforeEach(async () => {
            originalPost = await Post.create({
                description: 'Original content',
                federatedId: 'original@other.server/post/123',
                originServer: 'other.server',
                serverName: 'other.server',
                userDisplayName: 'Original Author',
                authorFederatedId: 'original@other.server'
            });
        });

        it('should repost a post successfully', async () => {
            postService.createPostService.mockResolvedValue({
                isRepost: true,
                originalPostFederatedId: originalPost.federatedId,
                originalAuthorFederatedId: originalPost.authorFederatedId
            });

            const res = await request(app)
                .post('/api/posts/repost')
                .set('Authorization', `Bearer ${token}`)
                .send({ postFederatedId: originalPost.federatedId });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(postService.createPostService).toHaveBeenCalled();
        });

        it('should prevent duplicate reposting of the same post', async () => {
            // First repost — needs to actually save to DB to trigger the duplicate check
            await Post.create({
                description: originalPost.description,
                federatedId: `tester@local.server/post/${Date.now()}`,
                originServer: 'local.server',
                serverName: 'local.server',
                authorFederatedId: testUser.federatedId,
                userDisplayName: testUser.displayName,
                isRepost: true,
                originalPostFederatedId: originalPost.federatedId,
                originalAuthorFederatedId: originalPost.authorFederatedId
            });

            // Second repost attempt
            const res = await request(app)
                .post('/api/posts/repost')
                .set('Authorization', `Bearer ${token}`)
                .send({ postFederatedId: originalPost.federatedId });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('already reposted');
        });
    });
});