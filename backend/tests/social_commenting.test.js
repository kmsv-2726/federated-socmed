import request from 'supertest';
import { createTestApp, generateToken } from './testApp.js';
import Post from '../models/Post.js';

describe('Commenting API', () => {
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

            // Verify in DB
            const updatedPost = await Post.findById(post._id);
            expect(updatedPost.comments).toHaveLength(1);
            expect(updatedPost.comments[0].content).toBe('Nice post!');
            expect(updatedPost.comments[0].displayName).toBe('Tester');
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
