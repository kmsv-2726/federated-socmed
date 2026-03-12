import { jest } from '@jest/globals';

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
MockChannel.findOne = jest.fn();

class MockChannelFollow {
    constructor(data) {
        Object.assign(this, data);
    }
}
MockChannelFollow.findOne = jest.fn();
MockChannelFollow.create = jest.fn();
MockChannelFollow.findOneAndDelete = jest.fn();

jest.unstable_mockModule('../../models/Channel.js', () => ({
    default: MockChannel
}));

jest.unstable_mockModule('../../models/ChannelFollow.js', () => ({
    default: MockChannelFollow
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const Channel = (await import('../../models/Channel.js')).default;
const ChannelFollow = (await import('../../models/ChannelFollow.js')).default;
const channelService = await import('../../services/channelService.js');

describe('Channel Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('followChannelService', () => {
        it('should do nothing if already following', async () => {
            ChannelFollow.findOne.mockResolvedValueOnce({ _id: 'follow123' });
            
            const channel = new MockChannel({ federatedId: 'channel@server.local', followersCount: 5 });
            await channelService.followChannelService('actor@remote.local', channel);

            expect(ChannelFollow.create).not.toHaveBeenCalled();
            expect(mockChannelSave).not.toHaveBeenCalled();
            expect(channel.followersCount).toBe(5);
        });

        it('should create follow and increment count if not following', async () => {
            ChannelFollow.findOne.mockResolvedValueOnce(null);
            
            const channel = new MockChannel({
                federatedId: 'channel@server.local',
                followersCount: 5,
                name: 'chan',
                serverName: 'server.local',
                originServer: 'server.local'
            });

            await channelService.followChannelService('actor@remote.local', channel);

            expect(ChannelFollow.create).toHaveBeenCalledWith({
                userFederatedId: 'actor@remote.local',
                channelFederatedId: 'channel@server.local',
                channelName: 'chan',
                serverName: 'server.local',
                userOriginServer: 'remote.local',
                channelOriginServer: 'server.local'
            });
            expect(channel.followersCount).toBe(6);
            expect(mockChannelSave).toHaveBeenCalled();
        });
    });

    describe('unFollowChannelService', () => {
        it('should do nothing if follow record not found', async () => {
            ChannelFollow.findOneAndDelete.mockResolvedValueOnce(null);
            
            const channel = new MockChannel({ federatedId: 'channel@server.local', followersCount: 5 });
            await channelService.unFollowChannelService('actor@remote.local', channel);

            expect(mockChannelSave).not.toHaveBeenCalled();
            expect(channel.followersCount).toBe(5);
        });

        it('should delete follow and decrement count without going below zero', async () => {
            ChannelFollow.findOneAndDelete.mockResolvedValueOnce({ _id: 'follow123' });
            
            const channel = new MockChannel({ federatedId: 'channel@server.local', followersCount: 1 });
            await channelService.unFollowChannelService('actor@remote.local', channel);

            expect(channel.followersCount).toBe(0);
            expect(mockChannelSave).toHaveBeenCalled();
        });
    });

    describe('getChannelProfileService', () => {
        it('should throw 404 if channel not found', async () => {
            Channel.findOne.mockResolvedValueOnce(null);

            await expect(channelService.getChannelProfileService('missing@server.local'))
                .rejects.toMatchObject({ status: 404 });
        });

        it('should return channel if found', async () => {
            const mockChan = { _id: 'c1', federatedId: 'found@server.local' };
            Channel.findOne.mockResolvedValueOnce(mockChan);

            const result = await channelService.getChannelProfileService('found@server.local');
            expect(result).toBe(mockChan);
        });
    });
});
