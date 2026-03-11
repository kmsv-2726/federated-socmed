import { jest } from '@jest/globals';

const mockPostSave = jest.fn().mockResolvedValue(true);
class MockPost {
    constructor(data) {
        Object.assign(this, data);
        this.likedBy = this.likedBy || [];
        this.likedBy.pull = jest.fn((id) => {
            const index = this.likedBy.indexOf(id);
            if (index > -1) this.likedBy.splice(index, 1);
        });
        this.comments = this.comments || [];
    }
    async save() {
        mockPostSave(this);
        return this;
    }
}
MockPost.findByIdAndDelete = jest.fn();
MockPost.find = jest.fn();

jest.unstable_mockModule('../../models/Post.js', () => ({
    default: MockPost
}));

const Post = (await import('../../models/Post.js')).default;
const postService = await import('../../services/postService.js');

describe('Post Service', () => {
    beforeEach(() => {
        process.env.SERVER_NAME = 'server.local';
        jest.clearAllMocks();
    });

    describe('createPostService', () => {
        it('should properly instantiate and save a new post', async () => {
            const data = {
                description: 'test post',
                image: 'img.jpg',
                isUserPost: true,
                userDisplayName: 'Tester',
                authorFederatedId: 'actor@server.local',
                federatedId: 'post1@server.local',
                originServer: 'server.local'
            };

            const result = await postService.createPostService(data);

            expect(result.description).toBe('test post');
            expect(result.federatedId).toBe('post1@server.local');
            expect(result.federationStatus).toBe('local');
            expect(mockPostSave).toHaveBeenCalled();
        });

        it('should correctly set isRepost defaults', async () => {
            const data = {
                description: 'repost post',
                isUserPost: true,
                authorFederatedId: 'reposter@server.local',
                federatedId: 'newpost@server.local',
                originServer: 'server.local',
                isRepost: true,
                originalPostFederatedId: 'oldpost@server.local',
                originalAuthorFederatedId: 'original@server.local'
            };

            const result = await postService.createPostService(data);

            expect(result.isRepost).toBe(true);
            expect(result.originalPostFederatedId).toBe('oldpost@server.local');
            expect(result.originalAuthorFederatedId).toBe('original@server.local');
            expect(mockPostSave).toHaveBeenCalled();
        });
    });

    describe('deletePostService', () => {
        it('should call findByIdAndDelete on the model', async () => {
            const mockPost = { _id: 'post123' };
            Post.findByIdAndDelete.mockResolvedValueOnce(true);

            await postService.deletePostService(mockPost);

            expect(Post.findByIdAndDelete).toHaveBeenCalledWith('post123');
        });
    });

    describe('toggleLikePostService', () => {
        it('should add like if not already liked', async () => {
            const mockPost = new MockPost({ _id: 'p1', likeCount: 0, likedBy: [] });
            
            const result = await postService.toggleLikePostService(mockPost, 'actor@server.local');

            expect(result.liked).toBe(true);
            expect(result.likeCount).toBe(1);
            expect(mockPost.likedBy).toContain('actor@server.local');
            expect(mockPostSave).toHaveBeenCalled();
        });

        it('should remove like if already liked', async () => {
            const mockPost = new MockPost({ _id: 'p1', likeCount: 1, likedBy: ['actor@server.local'] });
            
            const result = await postService.toggleLikePostService(mockPost, 'actor@server.local');

            expect(result.liked).toBe(false);
            expect(result.likeCount).toBe(0);
            expect(mockPost.likedBy.pull).toHaveBeenCalledWith('actor@server.local');
            expect(mockPost.likedBy).not.toContain('actor@server.local');
            expect(mockPostSave).toHaveBeenCalled();
        });
    });

    describe('addCommentService', () => {
        it('should format and append comment to post', async () => {
            const mockPost = new MockPost({ _id: 'p1', comments: [] });
            const commentData = {
                displayName: 'Commenter',
                content: 'Great post!',
                commentFederatedId: 'c1@server.local',
                originServer: 'server.local'
            };

            const result = await postService.addCommentService(mockPost, commentData);

            expect(result.content).toBe('Great post!');
            expect(mockPost.comments).toHaveLength(1);
            expect(mockPost.comments[0].commentFederatedId).toBe('c1@server.local');
            expect(mockPostSave).toHaveBeenCalled();
        });
    });

    describe('getPostsByIdsService', () => {
        it('should search for both user ids and channel ids', async () => {
            const mockChain = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValueOnce([ { _id: 'p1' }, { _id: 'p2' } ])
            };
            Post.find.mockReturnValueOnce(mockChain);

            const result = await postService.getPostsByIdsService(['user1@server.local'], ['chan1@server.local']);

            expect(Post.find).toHaveBeenCalledWith({
                $or: [
                    { authorFederatedId: { $in: ['user1@server.local'] }, isUserPost: true },
                    { isChannelPost: true, channelName: { $in: ['chan1'] }, originServer: 'server.local' }
                ]
            });
            expect(mockChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockChain.limit).toHaveBeenCalledWith(10);
            expect(result).toHaveLength(2);
        });

        it('should return empty array if both lists are empty', async () => {
            const result = await postService.getPostsByIdsService([], []);
            expect(result).toEqual([]);
            expect(Post.find).not.toHaveBeenCalled();
        });
    });
});
