import { jest } from '@jest/globals';

const mockMuteSave = jest.fn().mockResolvedValue(true);
class MockUserMute {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockMuteSave(this);
        return this;
    }
}
MockUserMute.findOne = jest.fn();
MockUserMute.findByIdAndDelete = jest.fn();
MockUserMute.find = jest.fn();

jest.unstable_mockModule('../../models/UserMute.js', () => ({
    default: MockUserMute
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const UserMute = (await import('../../models/UserMute.js')).default;
const muteController = await import('../../controllers/muteController.js');

describe('Mute Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { federatedId: 'actor@server.local' },
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

    describe('toggleMuteUser', () => {
        it('should return error if target missing', async () => {
            await muteController.toggleMuteUser(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });

        it('should return error if muting self', async () => {
            req.params.federatedId = 'actor@server.local';
            await muteController.toggleMuteUser(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });

        it('should unmute if existing mute found', async () => {
            req.params.federatedId = 'target@server.local';
            UserMute.findOne.mockResolvedValueOnce({ _id: 'mute123' });

            await muteController.toggleMuteUser(req, res, next);

            expect(UserMute.findByIdAndDelete).toHaveBeenCalledWith('mute123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isMuted: false }));
        });

        it('should mute if no existing mute found', async () => {
            req.params.federatedId = 'target@server.local';
            UserMute.findOne.mockResolvedValueOnce(null);

            await muteController.toggleMuteUser(req, res, next);

            expect(mockMuteSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isMuted: true }));
        });
    });

    describe('getMutedUsers', () => {
        it('should return list of muted user IDs', async () => {
            UserMute.find.mockResolvedValueOnce([
                { mutedFederatedId: 'target1@server.local' },
                { mutedFederatedId: 'target2@server.local' }
            ]);

            await muteController.getMutedUsers(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                mutedUserIds: ['target1@server.local', 'target2@server.local']
            }));
        });
    });

    describe('checkMuteStatus', () => {
        it('should return error if targetmissing', async () => {
            await muteController.checkMuteStatus(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });

        it('should return true if muted', async () => {
            req.params.federatedId = 'target@server.local';
            UserMute.findOne.mockResolvedValueOnce({ _id: 'mute123' });

            await muteController.checkMuteStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isMuted: true }));
        });

        it('should return false if not muted', async () => {
            req.params.federatedId = 'target@server.local';
            UserMute.findOne.mockResolvedValueOnce(null);

            await muteController.checkMuteStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isMuted: false }));
        });
    });
});
