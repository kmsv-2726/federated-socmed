import { jest } from '@jest/globals';

const mockFollowSave = jest.fn().mockResolvedValue(true);
class MockUserFollow {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockFollowSave(this);
        return this;
    }
}
MockUserFollow.findOne = jest.fn();
MockUserFollow.findOneAndDelete = jest.fn();

jest.unstable_mockModule('../../models/UserFollow.js', () => ({
    default: MockUserFollow
}));

jest.unstable_mockModule('../../models/User.js', () => ({
    default: {
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn()
    }
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const User = (await import('../../models/User.js')).default;
const UserFollow = (await import('../../models/UserFollow.js')).default;
const userService = await import('../../services/userService.js');

describe('User Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('followUserService', () => {
        it('should throw error if following self', async () => {
            await expect(userService.followUserService('user1', 'user1', 'server1', 'server1'))
                .rejects.toMatchObject({ status: 400 });
        });

        it('should throw error if already following', async () => {
            UserFollow.findOne.mockResolvedValueOnce({ _id: 'follow1' });
            
            await expect(userService.followUserService('user1', 'user2', 'server1', 'server2'))
                .rejects.toMatchObject({ status: 400 });
        });

        it('should create follow record and increment counts', async () => {
            UserFollow.findOne.mockResolvedValueOnce(null);

            await userService.followUserService('user1', 'user2', 'server1', 'server2');

            expect(mockFollowSave).toHaveBeenCalled();
            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { federatedId: 'user1' },
                { $inc: { followingCount: 1 } }
            );
            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { federatedId: 'user2' },
                { $inc: { followersCount: 1 } }
            );
        });
    });

    describe('unfollowUserService', () => {
        it('should throw error if unfollowing self', async () => {
            await expect(userService.unfollowUserService('user1', 'user1'))
                .rejects.toMatchObject({ status: 400 });
        });

        it('should throw error if not following', async () => {
            UserFollow.findOne.mockResolvedValueOnce(null);

            await expect(userService.unfollowUserService('user1', 'user2'))
                .rejects.toMatchObject({ status: 400 });
        });

        it('should delete follow record and decrement counts', async () => {
            UserFollow.findOne.mockResolvedValueOnce({ _id: 'follow1' });

            await userService.unfollowUserService('user1', 'user2');

            expect(UserFollow.findOneAndDelete).toHaveBeenCalledWith({
                followerFederatedId: 'user1',
                followingFederatedId: 'user2'
            });
            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { federatedId: 'user1' },
                { $inc: { followingCount: -1 } }
            );
            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { federatedId: 'user2' },
                { $inc: { followersCount: -1 } }
            );
        });
    });

    describe('getUserProfileService', () => {
        it('should throw 404 if user not found', async () => {
            User.findOne.mockResolvedValueOnce(null);
            
            await expect(userService.getUserProfileService('unknown'))
                .rejects.toMatchObject({ status: 404 });
        });

        it('should return user profile if found', async () => {
            const mockUser = { federatedId: 'target', displayName: 'Target' };
            User.findOne.mockResolvedValueOnce(mockUser);
            
            const result = await userService.getUserProfileService('target');

            expect(User.findOne).toHaveBeenCalledWith(
                { federatedId: 'target' },
                expect.any(Object)
            );
            expect(result).toBe(mockUser);
        });
    });
});
