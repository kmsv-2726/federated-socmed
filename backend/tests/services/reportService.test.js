import { jest } from '@jest/globals';

const mockReportSave = jest.fn().mockResolvedValue(true);
class MockReport {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockReportSave(this);
        return this;
    }
}

jest.unstable_mockModule('../../models/Report.js', () => ({
    default: MockReport
}));

jest.unstable_mockModule('../../models/Post.js', () => ({
    default: { findOne: jest.fn() }
}));

jest.unstable_mockModule('../../models/User.js', () => ({
    default: { findOne: jest.fn() }
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const Post = (await import('../../models/Post.js')).default;
const User = (await import('../../models/User.js')).default;
const reportService = await import('../../services/reportService.js');

describe('Report Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createReportService', () => {
        it('should throw error if required fields are missing', async () => {
            const data = { reporterId: 'user1', reportedId: 'user2' }; // missing targetType and reason
            await expect(reportService.createReportService(data))
                .rejects.toMatchObject({ status: 400 });
        });

        it('should throw error if targetType is invalid', async () => {
            const data = { reportedId: 'invalid', targetType: 'alien', reason: 'spam' };
            await expect(reportService.createReportService(data))
                .rejects.toMatchObject({ status: 400 });
        });

        it('should throw 404 if local post target not found', async () => {
            const data = { reportedId: 'post123', targetType: 'post', reason: 'spam', isRemoteTarget: false };
            Post.findOne.mockResolvedValueOnce(null);

            await expect(reportService.createReportService(data))
                .rejects.toMatchObject({ status: 404 });
        });

        it('should successfully create report for local post target', async () => {
            const data = { reportedId: 'post123', targetType: 'post', reason: 'spam', isRemoteTarget: false };
            Post.findOne.mockResolvedValueOnce({ _id: 'post123' });

            const result = await reportService.createReportService(data);

            expect(Post.findOne).toHaveBeenCalledWith({ federatedId: 'post123' });
            expect(mockReportSave).toHaveBeenCalled();
            expect(result.reportedId).toBe('post123');
        });

        it('should throw 404 if local user target not found', async () => {
            const data = { reportedId: 'user123', targetType: 'user', reason: 'spam', isRemoteTarget: false };
            User.findOne.mockResolvedValueOnce(null);

            await expect(reportService.createReportService(data))
                .rejects.toMatchObject({ status: 404 });
        });

        it('should successfully create report for local user target', async () => {
            const data = { reportedId: 'user123', targetType: 'user', reason: 'spam', isRemoteTarget: false };
            User.findOne.mockResolvedValueOnce({ _id: 'user123' });

            const result = await reportService.createReportService(data);

            expect(User.findOne).toHaveBeenCalledWith({ federatedId: 'user123' });
            expect(mockReportSave).toHaveBeenCalled();
            expect(result.reportedId).toBe('user123');
        });

        it('should skip existence checks for remote targets and save report', async () => {
            const data = { reportedId: 'remote@server', targetType: 'user', reason: 'spam', isRemoteTarget: true };

            const result = await reportService.createReportService(data);

            expect(User.findOne).not.toHaveBeenCalled();
            expect(Post.findOne).not.toHaveBeenCalled();
            expect(mockReportSave).toHaveBeenCalled();
            expect(result.isRemoteTarget).toBe(true);
        });
    });
});
