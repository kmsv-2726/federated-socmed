import { jest } from '@jest/globals';

jest.unstable_mockModule('../../services/postService.js', () => ({
    getPostsByIdsService: jest.fn()
}));

jest.unstable_mockModule('../../services/userService.js', () => ({
    getUserProfileService: jest.fn()
}));

jest.unstable_mockModule('../../services/channelService.js', () => ({
    getChannelProfileService: jest.fn()
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const { getPostsByIdsService } = await import('../../services/postService.js');
const { getUserProfileService } = await import('../../services/userService.js');
const { getChannelProfileService } = await import('../../services/channelService.js');
const { federationFeed } = await import('../../controllers/federationFeedController.js');

describe('Federation Feed Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            query: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should return 400 if type is unsupported', async () => {
        req.query.type = 'UNKNOWN_TYPE';
        await federationFeed(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: "Unsupported feed type: UNKNOWN_TYPE" }));
    });

    describe('GET_POSTS', () => {
        it('should get posts by user and channel IDs', async () => {
            req.query.type = 'GET_POSTS';
            req.query.userIds = 'user1,user2';
            req.query.channelIds = 'channel1';
            
            getPostsByIdsService.mockResolvedValue(['post1', 'post2']);

            await federationFeed(req, res, next);

            expect(getPostsByIdsService).toHaveBeenCalledWith(['user1', 'user2'], ['channel1']);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, posts: ['post1', 'post2'] });
        });

        it('should handle empty IDs gracefully', async () => {
            req.query.type = 'GET_POSTS';
            getPostsByIdsService.mockResolvedValue([]);

            await federationFeed(req, res, next);

            expect(getPostsByIdsService).toHaveBeenCalledWith([], []);
        });
    });

    describe('GET_PROFILE', () => {
        it('should fail if federatedId is missing', async () => {
            req.query.type = 'GET_PROFILE';
            await federationFeed(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: "federatedId is required" }));
        });

        it('should return user profile successfully', async () => {
            req.query.type = 'GET_PROFILE';
            req.query.federatedId = 'user@server.local';
            getUserProfileService.mockResolvedValue({ id: 'user@server.local', name: 'Test' });

            await federationFeed(req, res, next);

            expect(getUserProfileService).toHaveBeenCalledWith('user@server.local');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, user: { id: 'user@server.local', name: 'Test' } });
        });
    });

    describe('GET_CHANNEL', () => {
        it('should fail if federatedId is missing', async () => {
            req.query.type = 'GET_CHANNEL';
            await federationFeed(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: "federatedId is required" }));
        });

        it('should return channel profile successfully', async () => {
            req.query.type = 'GET_CHANNEL';
            req.query.federatedId = 'channel@server.local';
            getChannelProfileService.mockResolvedValue({ id: 'channel@server.local', name: 'TestChannel' });

            await federationFeed(req, res, next);

            expect(getChannelProfileService).toHaveBeenCalledWith('channel@server.local');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, channel: { id: 'channel@server.local', name: 'TestChannel' } });
        });
    });
});
