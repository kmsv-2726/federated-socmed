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
MockReport.find = jest.fn();
MockReport.findByIdAndUpdate = jest.fn();

jest.unstable_mockModule('../../models/Report.js', () => ({
    default: MockReport
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

jest.unstable_mockModule('../../services/federationService.js', () => ({
    sendFederationEvent: jest.fn()
}));

jest.unstable_mockModule('../../services/reportService.js', () => ({
    createReportService: jest.fn()
}));

const Report = (await import('../../models/Report.js')).default;
const federationService = await import('../../services/federationService.js');
const reportService = await import('../../services/reportService.js');
const reportController = await import('../../controllers/reportController.js');

describe('Report Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { federatedId: 'actor@server.local' },
            body: {},
            query: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        process.env.SERVER_NAME = 'server.local';
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (next.mock.calls.length > 0 && next.mock.calls[0][0]) {
            console.error("DEBUG REPORT ERROR:", next.mock.calls[0][0]);
        }
    });

    describe('createReport', () => {
        it('should return 400 if reportedId format invalid', async () => {
            req.body = { reportedId: 'invalidformat', targetType: 'user', reason: 'spam' };
            await reportController.createReport(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });

        it('should create local report without federation', async () => {
            req.body = { reportedId: 'target@server.local', targetType: 'user', reason: 'spam', description: 'bad target' };
            reportService.createReportService.mockResolvedValueOnce({ _id: 'report123' });

            await reportController.createReport(req, res, next);

            expect(reportService.createReportService).toHaveBeenCalledWith(expect.objectContaining({
                isRemoteTarget: false,
                targetOriginServer: 'server.local'
            }));
            expect(federationService.sendFederationEvent).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ reportId: 'report123' }));
        });

        it('should create remote report and send federation event', async () => {
            req.body = { reportedId: 'target@remote.local', targetType: 'user', reason: 'spam', description: 'bad remote' };
            reportService.createReportService.mockResolvedValueOnce({ _id: 'report456' });

            await reportController.createReport(req, res, next);

            expect(reportService.createReportService).toHaveBeenCalledWith(expect.objectContaining({
                isRemoteTarget: true,
                targetOriginServer: 'remote.local'
            }));
            expect(federationService.sendFederationEvent).toHaveBeenCalledWith(expect.objectContaining({
                type: 'REPORT',
                objectFederatedId: 'target@remote.local'
            }));
            expect(res.status).toHaveBeenCalledWith(201);
        });
        
        it('should silently catch federation event failure', async () => {
            req.body = { reportedId: 'target@remote.local', targetType: 'user' };
            reportService.createReportService.mockResolvedValueOnce({ _id: 'report456' });
            federationService.sendFederationEvent.mockRejectedValueOnce(new Error("Network Error"));

            await reportController.createReport(req, res, next);

            expect(federationService.sendFederationEvent).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201); // Still returns 201
        });
    });

    describe('getAllReports', () => {
        it('should return list of reports with query filters', async () => {
            req.query = { status: 'pending', limit: 10 };
            const mockChain = {
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([ { _id: 'r1' }, { _id: 'r2' } ])
            };
            Report.find.mockReturnValueOnce(mockChain);

            await reportController.getAllReports(req, res, next);

            expect(Report.find).toHaveBeenCalledWith({ status: 'pending' });
            expect(mockChain.limit).toHaveBeenCalledWith(10);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
        });
    });

    describe('updateReportStatus', () => {
        it('should return 400 if invalid status', async () => {
            req.params.reportId = 'r1';
            req.body.status = 'invalid_state';

            await reportController.updateReportStatus(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });

        it('should return 404 if report not found', async () => {
            req.params.reportId = 'r1';
            req.body.status = 'resolved';
            Report.findByIdAndUpdate.mockResolvedValueOnce(null);

            await reportController.updateReportStatus(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
        });

        it('should return 200 and updated report if successful', async () => {
            req.params.reportId = 'r1';
            req.body.status = 'resolved';
            Report.findByIdAndUpdate.mockResolvedValueOnce({ _id: 'r1', status: 'resolved' });

            await reportController.updateReportStatus(req, res, next);

            expect(Report.findByIdAndUpdate).toHaveBeenCalledWith('r1', { status: 'resolved' }, { new: true });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'resolved' }));
        });
    });
});
