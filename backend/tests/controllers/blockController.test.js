import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/UserBlock.js', () => ({
    default: {
        findOne: jest.fn(),
        findByIdAndDelete: jest.fn(),
        find: jest.fn()
    }
}));

const mockUserBlockSave = jest.fn().mockResolvedValue(true);
class MockUserBlock {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockUserBlockSave(this);
        return this;
    }
}
MockUserBlock.findOne = jest.fn();
MockUserBlock.findByIdAndDelete = jest.fn();
MockUserBlock.find = jest.fn();

jest.unstable_mockModule('../../models/UserBlock.js', () => ({
    default: MockUserBlock
}));
const UserBlockMock = (await import('../../models/UserBlock.js')).default;

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const UserBlock = (await import('../../models/UserBlock.js')).default;
const { toggleBlockUser, checkBlockStatus, getBlockedUsers, checkBothBlocks } = await import('../../controllers/blockController.js');

describe('Block Controller', () => {
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

    describe('toggleBlockUser', () => {
        it('should block a user successfully if not already blocked', async () => {
            req.params.federatedId = 'target@server.local';
            UserBlock.findOne.mockResolvedValue(null);

            await toggleBlockUser(req, res, next);
            if (next.mock.calls.length > 0) {
                console.error("DEBUG NEXT CATCH ERROR IN BLOCK:", next.mock.calls[0][0]);
            }

            expect(mockUserBlockSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isBlocked: true }));
        });

        it('should unblock a user successfully if already blocked', async () => {
            req.params.federatedId = 'target@server.local';
            const mockBlock = { _id: 'block123' };
            UserBlock.findOne.mockResolvedValue(mockBlock);

            await toggleBlockUser(req, res, next);

            expect(UserBlock.findByIdAndDelete).toHaveBeenCalledWith('block123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isBlocked: false }));
        });

        it('should return error if trying to block oneself', async () => {
            req.params.federatedId = 'actor@server.local';

            await toggleBlockUser(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0][0]).toMatchObject({ status: 400, message: "You cannot block yourself" });
        });

        it('should return error if target federatedId is missing', async () => {
            await toggleBlockUser(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next.mock.calls[0][0]).toMatchObject({ status: 400, message: "Target federatedId is required" });
        });
    });

    describe('checkBlockStatus', () => {
        it('should return isBlocked: true if blocked', async () => {
            req.params.federatedId = 'target@server.local';
            UserBlock.findOne.mockResolvedValue({ _id: 'block123' });

            await checkBlockStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isBlocked: true }));
        });

        it('should return isBlocked: false if not blocked', async () => {
            req.params.federatedId = 'target@server.local';
            UserBlock.findOne.mockResolvedValue(null);

            await checkBlockStatus(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isBlocked: false }));
        });
    });

    describe('getBlockedUsers', () => {
        it('should return list of blocked user IDs', async () => {
            UserBlock.find.mockResolvedValue([
                { blockedFederatedId: 'user1@server.local' },
                { blockedFederatedId: 'user2@server.local' }
            ]);

            await getBlockedUsers(req, res, next);

            expect(UserBlock.find).toHaveBeenCalledWith({ blockerFederatedId: 'actor@server.local' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                blockedUserIds: ['user1@server.local', 'user2@server.local']
            }));
        });
    });

    describe('checkBothBlocks', () => {
        it('should return null details if no blocks exist between users', async () => {
            req.params.federatedId = 'target@server.local';
            UserBlock.findOne.mockResolvedValue(null);

            await checkBothBlocks(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                isBlocked: false,
                details: null
            });
        });

        it('should indicate if active user blocked the target', async () => {
            req.params.federatedId = 'target@server.local';
            UserBlock.findOne.mockResolvedValue({
                blockerFederatedId: 'actor@server.local',
                blockedFederatedId: 'target@server.local'
            });

            await checkBothBlocks(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                isBlocked: true,
                details: 'you_blocked'
            }));
        });

        it('should indicate if target blocked the active user', async () => {
            req.params.federatedId = 'target@server.local';
            UserBlock.findOne.mockResolvedValue({
                blockerFederatedId: 'target@server.local',
                blockedFederatedId: 'actor@server.local'
            });

            await checkBothBlocks(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                isBlocked: true,
                details: 'they_blocked'
            }));
        });
    });
});
