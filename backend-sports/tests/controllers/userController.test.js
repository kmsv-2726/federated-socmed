import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../models/User.js', () => ({
    default: {
        find: jest.fn(),
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
    },
}));

jest.unstable_mockModule('../../models/UserFollow.js', () => ({
    default: {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        findOneAndDelete: jest.fn(),
    },
}));

// Import the module under test and mocked dependencies
// Note: Imports must be dynamic to ensure mocks are applied first
const { getAllProfiles, getUserProfile } = await import('../../controllers/userController.js');
const User = (await import('../../models/User.js')).default;
const UserFollow = (await import('../../models/UserFollow.js')).default;

describe('User Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {},
            user: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getAllProfiles', () => {
        it('should return all profiles', async () => {
            const mockUsers = [
                { displayName: 'User1', email: 'user1@example.com' },
                { displayName: 'User2', email: 'user2@example.com' }
            ];
            User.find.mockResolvedValue(mockUsers);

            await getAllProfiles(req, res, next);

            expect(User.find).toHaveBeenCalledWith({}, expect.any(Object));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                users: mockUsers
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            User.find.mockRejectedValue(error);

            await getAllProfiles(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getUserProfile', () => {
        it('should return a user profile if found', async () => {
            req.params.federatedId = '123';
            const mockUser = { federatedId: '123', displayName: 'User1' };
            User.findOne.mockResolvedValue(mockUser);

            await getUserProfile(req, res, next);

            expect(User.findOne).toHaveBeenCalledWith({ federatedId: '123' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: mockUser
            });
        });

        it('should call next with error if user not found', async () => {
            req.params.federatedId = '999';
            User.findOne.mockResolvedValue(null);

            await getUserProfile(req, res, next);

            expect(User.findOne).toHaveBeenCalledWith({ federatedId: '999' });
            expect(next).toHaveBeenCalledWith(expect.any(Error));
            // Verify error properties if possible, but expecting Error is good enough for now
        });

        it('should handle errors during findOne', async () => {
            req.params.federatedId = '123';
            const error = new Error('Database error');
            User.findOne.mockRejectedValue(error);

            await getUserProfile(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
