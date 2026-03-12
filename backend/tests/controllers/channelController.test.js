import { jest } from '@jest/globals';

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const mockChannelSave = jest.fn().mockResolvedValue(true);
class MockChannel {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockChannelSave(this);
        return this;
    }
}
MockChannel.findById = jest.fn();
MockChannel.findByIdAndDelete = jest.fn();
MockChannel.find = jest.fn();
MockChannel.findOne = jest.fn();

jest.unstable_mockModule('../../models/Channel.js', () => ({
    default: MockChannel
}));

const MockChannelFollowConstructor = jest.fn();
MockChannelFollowConstructor.findOne = jest.fn();
MockChannelFollowConstructor.create = jest.fn();
MockChannelFollowConstructor.findOneAndDelete = jest.fn();
MockChannelFollowConstructor.find = jest.fn();

jest.unstable_mockModule('../../models/ChannelFollow.js', () => ({
    default: MockChannelFollowConstructor
}));

const mockChannelRequestSave = jest.fn().mockResolvedValue(true);
jest.unstable_mockModule('../../models/ChannelRequest.js', () => ({
    default: jest.fn().mockImplementation(function(data) {
        Object.assign(this, data);
        this.save = mockChannelRequestSave;
    })
}));
const ChannelRequestMock = (await import('../../models/ChannelRequest.js')).default;
ChannelRequestMock.findOne = jest.fn();
ChannelRequestMock.create = jest.fn().mockResolvedValue({ _id: 'newreq123' });
ChannelRequestMock.deleteOne = jest.fn();
ChannelRequestMock.find = jest.fn();

const MockTrustedServerConstructor = jest.fn();
MockTrustedServerConstructor.findOne = jest.fn();

jest.unstable_mockModule('../../models/TrustedServer.js', () => ({
    default: MockTrustedServerConstructor
}));

jest.unstable_mockModule('axios', () => ({
    default: { get: jest.fn(), post: jest.fn() }
}));

jest.unstable_mockModule('../../services/channelService.js', () => ({
    followChannelService: jest.fn(),
    unFollowChannelService: jest.fn(),
    getChannelProfileService: jest.fn()
}));

jest.unstable_mockModule('../../services/federationService.js', () => ({
    sendFederationEvent: jest.fn()
}));

const Channel = (await import('../../models/Channel.js')).default;
const ChannelFollow = (await import('../../models/ChannelFollow.js')).default;
const ChannelRequest = (await import('../../models/ChannelRequest.js')).default;
const TrustedServer = (await import('../../models/TrustedServer.js')).default;
const axios = (await import('axios')).default;
const { followChannelService, unFollowChannelService, getChannelProfileService } = await import('../../services/channelService.js');
const { sendFederationEvent } = await import('../../services/federationService.js');

const channelController = await import('../../controllers/channelController.js');

describe('Channel Controller', () => {
    let req, res, next;

    beforeEach(() => {
        process.env.SERVER_NAME = 'server.local';
        req = {
            user: { federatedId: 'actor@server.local', serverName: 'server.local', role: 'user', displayName: 'Actor' },
            params: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('createChannel', () => {
        it('should successfully create a new channel', async () => {
            req.body = { name: 'testchannel', description: 'Test', rules: ['rule1'] };
            mockChannelSave.mockResolvedValueOnce({ _id: 'c123', name: 'testchannel' });

            await channelController.createChannel(req, res, next);

            expect(mockChannelSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, channel: expect.any(Object) }));
        });

        it('should fail if missing required fields', async () => {
            req.body = { name: 'testchannel' }; // missing description and rules

            await channelController.createChannel(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });
    });

    describe('deleteChannel', () => {
        it('should delete channel if user is creator', async () => {
            req.params.id = 'c123';
            Channel.findById.mockResolvedValueOnce({ _id: 'c123', isRemote: false, createdBy: 'actor@server.local' });

            await channelController.deleteChannel(req, res, next);

            expect(Channel.findByIdAndDelete).toHaveBeenCalledWith('c123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should delete channel if user is admin', async () => {
            req.params.id = 'c123';
            req.user.role = 'admin';
            Channel.findById.mockResolvedValueOnce({ _id: 'c123', isRemote: false, createdBy: 'other@server.local' });

            await channelController.deleteChannel(req, res, next);

            expect(Channel.findByIdAndDelete).toHaveBeenCalledWith('c123');
        });

        it('should fail if user is not creator or admin', async () => {
            req.params.id = 'c123';
            Channel.findById.mockResolvedValueOnce({ _id: 'c123', isRemote: false, createdBy: 'other@server.local' });

            await channelController.deleteChannel(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
            expect(Channel.findByIdAndDelete).not.toHaveBeenCalled();
        });

        it('should fail if channel is remote', async () => {
            req.params.id = 'c123';
            Channel.findById.mockResolvedValueOnce({ _id: 'c123', isRemote: true, createdBy: 'actor@server.local' });

            await channelController.deleteChannel(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403, message: "Cannot delete remote channel" }));
        });
    });

    describe('getChannel', () => {
        it('should handle local fuzzy search without @', async () => {
            req.params.channelName = 'test';
            Channel.find.mockReturnValueOnce({ limit: jest.fn().mockResolvedValueOnce([{ name: 'testchannel' }]) });

            await channelController.getChannel(req, res, next);

            expect(Channel.find).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ channels: [{ name: 'testchannel' }] }));
        });

        it('should get a local channel explicitly with @', async () => {
            req.params.channelName = 'test@server.local';
            getChannelProfileService.mockResolvedValueOnce({ name: 'test' });

            await channelController.getChannel(req, res, next);

            expect(getChannelProfileService).toHaveBeenCalledWith('test@server.local');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ channels: { name: 'test' } }));
        });

        it('should get a remote channel via federation', async () => {
            req.params.channelName = 'test@remote.com';
            TrustedServer.findOne.mockResolvedValueOnce({ serverUrl: 'https://remote.com', isActive: true });
            axios.get.mockResolvedValueOnce({ data: { channel: { name: 'test' } } });

            await channelController.getChannel(req, res, next);

            expect(TrustedServer.findOne).toHaveBeenCalledWith({ serverName: 'remote.com', isActive: true });
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('https://remote.com/api/federation/feed'), expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should fail if remote server is not trusted', async () => {
            req.params.channelName = 'test@remote.com';
            TrustedServer.findOne.mockResolvedValueOnce(null);

            await channelController.getChannel(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
        });
    });

    describe('followChannel', () => {
        it('should follow a local channel', async () => {
            req.params.channelName = 'test@server.local';
            Channel.findOne.mockResolvedValueOnce({ name: 'test', visibility: 'public', serverName: 'server.local' });

            await channelController.followChannel(req, res, next);

            expect(followChannelService).toHaveBeenCalledWith('actor@server.local', expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should fail to follow if channel is private and user is not admin/creator', async () => {
            req.params.channelName = 'test@server.local';
            Channel.findOne.mockResolvedValueOnce({ name: 'test', visibility: 'private', createdBy: 'other', serverName: 'server.local' });

            await channelController.followChannel(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
        });

        it('should follow a remote channel via federation', async () => {
            req.params.channelName = 'test@remote.com';
            ChannelFollow.findOne.mockResolvedValueOnce(null);
            sendFederationEvent.mockResolvedValueOnce({}); // Success

            await channelController.followChannel(req, res, next);

            expect(sendFederationEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'FOLLOW_CHANNEL' }));
            expect(ChannelFollow.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should fail to follow a remote channel if already following', async () => {
            req.params.channelName = 'test@remote.com';
            ChannelFollow.findOne.mockResolvedValueOnce({ _id: 'f1' });

            await channelController.followChannel(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: "Already following channel" }));
            expect(sendFederationEvent).not.toHaveBeenCalled();
        });
    });

    describe('unFollowChannel', () => {
        it('should unfollow a local channel', async () => {
            req.params.channelName = 'test@server.local';
            Channel.findOne.mockResolvedValueOnce({ name: 'test', serverName: 'server.local' });

            await channelController.unFollowChannel(req, res, next);

            expect(unFollowChannelService).toHaveBeenCalledWith('actor@server.local', expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should unfollow a remote channel', async () => {
            req.params.channelName = 'test@remote.com';
            ChannelFollow.findOne.mockResolvedValueOnce({ _id: 'f1' });
            sendFederationEvent.mockResolvedValueOnce({});

            await channelController.unFollowChannel(req, res, next);

            expect(sendFederationEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'UNFOLLOW_CHANNEL' }));
            expect(ChannelFollow.findOneAndDelete).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should fail to unfollow a remote channel if not following', async () => {
            req.params.channelName = 'test@remote.com';
            ChannelFollow.findOne.mockResolvedValueOnce(null);

            await channelController.unFollowChannel(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });
    });

    describe('requestAccess', () => {
        it('should create an access request for a local private channel', async () => {
            req.params.channelName = 'test@server.local';
            Channel.findOne.mockResolvedValueOnce({ name: 'test', visibility: 'private', federatedId: 'test@server.local', serverName: 'server.local' });
            ChannelFollow.findOne.mockResolvedValueOnce(null);
            ChannelRequest.findOne.mockResolvedValueOnce(null);
            ChannelRequestMock.create.mockResolvedValueOnce({ _id: 'newreq123' });

            await channelController.requestAccess(req, res, next);
            if (next.mock.calls.length > 0) {
                console.error("DEBUG NEXT CATCH ERROR IN CHANNEL:", next.mock.calls[0][0]);
            }

            expect(ChannelRequestMock.create).toHaveBeenCalledWith(expect.objectContaining({
                channelFederatedId: 'test@server.local',
                userFederatedId: 'actor@server.local'
            }));
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject request for remote channels', async () => {
            req.params.channelName = 'test@remote.com';

            await channelController.requestAccess(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });

        it('should reject request if channel is public', async () => {
            req.params.channelName = 'test@server.local';
            Channel.findOne.mockResolvedValueOnce({ name: 'test', visibility: 'public', federatedId: 'test@server.local', serverName: 'server.local' });

            await channelController.requestAccess(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: expect.stringContaining("private") }));
        });
    });

    describe('resolveAccessRequest', () => {
        it('should approve a request and create a ChannelFollow', async () => {
            req.params.channelName = 'test@server.local';
            req.body = { userFederatedId: 'target@server.local', action: 'approve' };
            
            const mockChannel = { name: 'test', serverName: 'server.local', federatedId: 'test@server.local', createdBy: 'actor@server.local' };
            Channel.findOne.mockResolvedValueOnce(mockChannel);
            
            const mockRequest = { _id: 'req123', status: 'pending' };
            ChannelRequest.findOne.mockResolvedValueOnce(mockRequest);
            ChannelFollow.findOne.mockResolvedValueOnce(null);

            await channelController.resolveAccessRequest(req, res, next);

            expect(ChannelFollow.create).toHaveBeenCalled();
            expect(ChannelRequestMock.deleteOne).toHaveBeenCalledWith({ _id: 'req123' });
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should reject a request by updating its status to rejected', async () => {
            req.params.channelName = 'test@server.local';
            req.body = { userFederatedId: 'target@server.local', action: 'reject' };
            
            const mockChannel = { name: 'test', serverName: 'server.local', federatedId: 'test@server.local', createdBy: 'actor@server.local' };
            Channel.findOne.mockResolvedValueOnce(mockChannel);
            
            const mockRequest = { _id: 'req123', status: 'pending', save: jest.fn() };
            ChannelRequest.findOne.mockResolvedValueOnce(mockRequest);

            await channelController.resolveAccessRequest(req, res, next);

            expect(mockRequest.status).toBe('rejected');
            expect(mockRequest.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should fail if user is not creator or admin', async () => {
            req.params.channelName = 'test@server.local';
            req.body = { userFederatedId: 'target@server.local', action: 'approve' };
            
            const mockChannel = { name: 'test', serverName: 'server.local', federatedId: 'test@server.local', createdBy: 'someoneelse@server.local' };
            Channel.findOne.mockResolvedValueOnce(mockChannel);

            await channelController.resolveAccessRequest(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
        });
    });
});
