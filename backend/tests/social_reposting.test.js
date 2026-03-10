import request from 'supertest';
import { createTestApp, generateToken } from './testApp.js';
import Post from '../models/Post.js';

describe('Reposting API', () => {
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
            const res = await request(app)
                .post('/api/posts/repost')
                .set('Authorization', `Bearer ${token}`)
                .send({ postFederatedId: originalPost.federatedId });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.post.isRepost).toBe(true);
            expect(res.body.post.originalPostFederatedId).toBe(originalPost.federatedId);
            expect(res.body.post.originalAuthorFederatedId).toBe(originalPost.authorFederatedId);
        });

        it('should prevent duplicate reposting of the same post', async () => {
            // First repost
            await request(app)
                .post('/api/posts/repost')
                .set('Authorization', `Bearer ${token}`)
                .send({ postFederatedId: originalPost.federatedId });

            // Second repost
            const res = await request(app)
                .post('/api/posts/repost')
                .set('Authorization', `Bearer ${token}`)
                .send({ postFederatedId: originalPost.federatedId });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('already reposted');
        });
    });
});
