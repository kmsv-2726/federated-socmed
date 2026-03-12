import { jest } from '@jest/globals';

const mockEventSave = jest.fn().mockResolvedValue(true);
class MockFederationEvent {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockEventSave(this);
        return this;
    }
}
MockFederationEvent.findOne = jest.fn();
MockFederationEvent.create = async (data) => {
    const doc = new MockFederationEvent(data);
    return doc;
};

jest.unstable_mockModule('../../models/FederationEvent.js', () => ({
    default: MockFederationEvent
}));

jest.unstable_mockModule('../../models/User.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../../models/Channel.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../../models/Post.js', () => ({ default: { findOne: jest.fn() } }));

jest.unstable_mockModule('../../services/userService.js', () => ({
    followUserService: jest.fn(),
    unfollowUserService: jest.fn()
}));
jest.unstable_mockModule('../../services/channelService.js', () => ({
    followChannelService: jest.fn(),
    unFollowChannelService: jest.fn()
}));
jest.unstable_mockModule('../../services/postService.js', () => ({
    toggleLikePostService: jest.fn(),
    addCommentService: jest.fn(),
    createPostService: jest.fn(),
    deletePostService: jest.fn()
}));
jest.unstable_mockModule('../../services/reportService.js', () => ({
    createReportService: jest.fn()
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const FederationEvent = (await import('../../models/FederationEvent.js')).default;
const User = (await import('../../models/User.js')).default;
const Channel = (await import('../../models/Channel.js')).default;
const Post = (await import('../../models/Post.js')).default;

const { followUserService, unfollowUserService } = await import('../../services/userService.js');
const { followChannelService, unFollowChannelService } = await import('../../services/channelService.js');
const { toggleLikePostService, addCommentService, createPostService, deletePostService } = await import('../../services/postService.js');
const { createReportService } = await import('../../services/reportService.js');

const { federationInbox } = await import('../../controllers/federationInboxController.js');

describe('Federation Inbox Controller', () => {
    let req, res, next;

    beforeEach(() => {
        process.env.SERVER_NAME = 'server.local';
        req = {
            body: {
                type: 'FOLLOW_USER',
                eventId: 'evt-123',
                actor: { federatedId: 'actor@remote.local', server: 'remote.local' },
                object: { federatedId: 'target@server.local' },
                data: {}
            },
            federation: { originServer: 'remote.local' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (next.mock.calls.length > 0 && next.mock.calls[0][0]) {
            console.error("DEBUG FEDERATION INBOX NEXT ERROR:", next.mock.calls[0][0]);
        }
    });

    it('should block idempotent/duplicate events', async () => {
        FederationEvent.findOne.mockResolvedValueOnce({ _id: 'duplicate' });

        await federationInbox(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("processed") }));
    });

    it('should throw error for invalid payload', async () => {
        req.body = null;
        await federationInbox(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    });

    describe('FOLLOW_USER', () => {
        it('should follow a local user', async () => {
            req.body.type = 'FOLLOW_USER';
            User.findOne.mockResolvedValueOnce({ id: 'target' });

            await federationInbox(req, res, next);

            expect(User.findOne).toHaveBeenCalledWith({ federatedId: 'target@server.local' });
            expect(followUserService).toHaveBeenCalledWith('actor@remote.local', 'target@server.local', 'remote.local', 'server.local', true);
            expect(mockEventSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should fail if target user not found', async () => {
            req.body.type = 'FOLLOW_USER';
            User.findOne.mockResolvedValueOnce(null);

            await federationInbox(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
            expect(mockEventSave).toHaveBeenCalled(); // Since outer failure marks eventDoc as failed
        });
    });

    describe('UNFOLLOW_USER', () => {
        it('should unfollow a user', async () => {
            req.body.type = 'UNFOLLOW_USER';

            await federationInbox(req, res, next);

            expect(unfollowUserService).toHaveBeenCalledWith('actor@remote.local', 'target@server.local');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('FOLLOW_CHANNEL', () => {
        it('should follow a channel', async () => {
            req.body.type = 'FOLLOW_CHANNEL';
            const mockChannel = { name: 'test' };
            Channel.findOne.mockResolvedValueOnce(mockChannel);

            await federationInbox(req, res, next);

            expect(Channel.findOne).toHaveBeenCalledWith({ federatedId: 'target@server.local' });
            expect(followChannelService).toHaveBeenCalledWith('actor@remote.local', mockChannel, true);
        });

        it('should fail if channel not found', async () => {
            req.body.type = 'FOLLOW_CHANNEL';
            Channel.findOne.mockResolvedValueOnce(null);

            await federationInbox(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
        });
    });

    describe('UNFOLLOW_CHANNEL', () => {
        it('should unfollow a channel', async () => {
            req.body.type = 'UNFOLLOW_CHANNEL';
            const mockChannel = { name: 'test' };
            Channel.findOne.mockResolvedValueOnce(mockChannel);

            await federationInbox(req, res, next);

            expect(unFollowChannelService).toHaveBeenCalledWith('actor@remote.local', mockChannel);
        });
    });

    describe('LIKE_POST', () => {
        it('should like a post', async () => {
            req.body.type = 'LIKE_POST';
            const mockPost = { _id: 'post1' };
            Post.findOne.mockResolvedValueOnce(mockPost);

            await federationInbox(req, res, next);

            expect(toggleLikePostService).toHaveBeenCalledWith(mockPost, 'actor@remote.local');
        });
    });

    describe('COMMENT_POST', () => {
        it('should comment on a post', async () => {
            req.body.type = 'COMMENT_POST';
            req.body.data = { displayName: 'Tester', content: 'hello' };
            const mockPost = { _id: 'post1' };
            Post.findOne.mockResolvedValueOnce(mockPost);

            await federationInbox(req, res, next);

            expect(addCommentService).toHaveBeenCalledWith(mockPost, expect.objectContaining({
                content: 'hello',
                originServer: 'remote.local'
            }));
        });
    });

    describe('CREATE_POST', () => {
        it('should create a remote post', async () => {
            req.body.type = 'CREATE_POST';
            req.body.data = { description: 'test post' };

            await federationInbox(req, res, next);

            expect(createPostService).toHaveBeenCalledWith(expect.objectContaining({
                description: 'test post',
                isRemote: true
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('DELETE_POST', () => {
        it('should delete a remote post', async () => {
            req.body.type = 'DELETE_POST';
            const mockPost = { _id: 'post99' };
            Post.findOne.mockResolvedValueOnce(mockPost);

            await federationInbox(req, res, next);

            expect(deletePostService).toHaveBeenCalledWith(mockPost);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should silently ignore if post not found', async () => {
            req.body.type = 'DELETE_POST';
            Post.findOne.mockResolvedValueOnce(null);

            await federationInbox(req, res, next);

            expect(deletePostService).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('REPORT', () => {
        it('should create a report', async () => {
            req.body.type = 'REPORT';
            req.body.data = { targetType: 'post', reason: 'spam', description: 'test' };

            await federationInbox(req, res, next);

            expect(createReportService).toHaveBeenCalledWith(expect.objectContaining({
                targetType: 'post',
                isRemoteTarget: false
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    it('should throw error on unknown type', async () => {
        req.body.type = 'UNKNOWN_TYPE';

        await federationInbox(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        expect(mockEventSave).toHaveBeenCalled(); // Since it failed, it updates processingStatus
    });
});
