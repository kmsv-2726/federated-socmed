import { jest } from '@jest/globals';
import crypto from 'crypto';

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
MockFederationEvent.create = async (data) => {
    return new MockFederationEvent(data);
};

jest.unstable_mockModule('../../models/FederationEvent.js', () => ({
    default: MockFederationEvent
}));

jest.unstable_mockModule('../../models/TrustedServer.js', () => ({
    default: {
        findOne: jest.fn()
    }
}));

jest.unstable_mockModule('../../utils/signPayload.js', () => ({
    signPayload: jest.fn().mockReturnValue('mocked_signature')
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

jest.unstable_mockModule('axios', () => ({
    default: {
        post: jest.fn()
    }
}));

const FederationEvent = (await import('../../models/FederationEvent.js')).default;
const TrustedServer = (await import('../../models/TrustedServer.js')).default;
const axios = (await import('axios')).default;
const federationService = await import('../../services/federationService.js');

describe('Federation Service', () => {
    beforeEach(() => {
        process.env.SERVER_NAME = 'server.local';
        process.env.PRIVATE_KEY = 'dummy_key';
        jest.clearAllMocks();
    });

    describe('sendFederationEvent', () => {
        it('should throw error if federatedId is invalid format', async () => {
            await expect(federationService.sendFederationEvent({
                type: 'FOLLOW_USER',
                actorFederatedId: 'actor@server.local',
                objectFederatedId: 'invalidformat'
            })).rejects.toMatchObject({ status: 400 });
        });

        it('should throw error if targetServer is local server', async () => {
            await expect(federationService.sendFederationEvent({
                type: 'FOLLOW_USER',
                actorFederatedId: 'actor@server.local',
                objectFederatedId: 'target@server.local'
            })).rejects.toMatchObject({ status: 400 });
        });

        it('should throw error if targetServer is not trusted', async () => {
            TrustedServer.findOne.mockResolvedValueOnce(null);

            await expect(federationService.sendFederationEvent({
                type: 'FOLLOW_USER',
                actorFederatedId: 'actor@server.local',
                objectFederatedId: 'target@untrusted.local'
            })).rejects.toMatchObject({ status: 403 });
        });

        it('should return skipped status if server is trusted but inactive', async () => {
            TrustedServer.findOne.mockResolvedValueOnce({
                serverName: 'inactive.local',
                isActive: false
            });

            const result = await federationService.sendFederationEvent({
                type: 'FOLLOW_USER',
                actorFederatedId: 'actor@server.local',
                objectFederatedId: 'target@inactive.local'
            });

            expect(result).toEqual({ skipped: true, reason: 'server_paused' });
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should successfully send event and mark processed', async () => {
            TrustedServer.findOne.mockResolvedValueOnce({
                serverName: 'trusted.local',
                serverUrl: 'http://trusted.local',
                isActive: true
            });
            axios.post.mockResolvedValueOnce({ data: { success: true } });

            const result = await federationService.sendFederationEvent({
                type: 'FOLLOW_USER',
                actorFederatedId: 'actor@server.local',
                objectFederatedId: 'target@trusted.local',
                data: { foo: 'bar' }
            });

            expect(axios.post).toHaveBeenCalledWith(
                'http://trusted.local/api/federation/inbox',
                expect.objectContaining({ type: 'FOLLOW_USER', data: { foo: 'bar' } }),
                expect.objectContaining({ headers: expect.any(Object) })
            );
            expect(mockEventSave).toHaveBeenCalled(); // Ensure processed save is called
            expect(result).toEqual({ success: true });
        });

        it('should log failed event in DB and return gracefully on network error', async () => {
            TrustedServer.findOne.mockResolvedValueOnce({
                serverName: 'trusted.local',
                serverUrl: 'http://trusted.local',
                isActive: true
            });
            axios.post.mockRejectedValueOnce(new Error('Network disconnected'));

            const result = await federationService.sendFederationEvent({
                type: 'FOLLOW_USER',
                actorFederatedId: 'actor@server.local',
                objectFederatedId: 'target@trusted.local'
            });

            expect(axios.post).toHaveBeenCalled();
            expect(mockEventSave).toHaveBeenCalled(); // Event should be queued/failed
            expect(result).toEqual({ queued: true });
        });
    });
});
