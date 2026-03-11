import { jest } from '@jest/globals';

const mockConfigSave = jest.fn().mockResolvedValue(true);
class MockServerConfig {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockConfigSave(this);
        return this;
    }
}
MockServerConfig.findOne = jest.fn();

jest.unstable_mockModule('../../models/ServerConfig.js', () => ({
    default: MockServerConfig
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const ServerConfig = (await import('../../models/ServerConfig.js')).default;
const serverConfigController = await import('../../controllers/serverConfigController.js');

describe('Server Config Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { role: 'admin' },
            body: {}
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
            console.error("DEBUG CONFIG ERROR:", next.mock.calls[0][0]);
        }
    });

    describe('getServerConfig', () => {
        it('should return existing config if found', async () => {
            ServerConfig.findOne.mockResolvedValueOnce({
                serverName: 'server.local',
                description: 'test config',
                rules: 'test rules',
                updatedAt: new Date()
            });

            await serverConfigController.getServerConfig(req, res, next);

            expect(ServerConfig.findOne).toHaveBeenCalledWith({ serverName: 'server.local' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                config: expect.objectContaining({ serverName: 'server.local', description: 'test config' })
            }));
        });

        it('should initialize and return new config if none exists', async () => {
            ServerConfig.findOne.mockResolvedValueOnce(null);

            await serverConfigController.getServerConfig(req, res, next);

            expect(mockConfigSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                config: expect.objectContaining({ serverName: 'server.local' })
            }));
        });
    });

    describe('updateServerConfig', () => {
        it('should return 403 if user is not admin', async () => {
            req.user.role = 'user';
            await serverConfigController.updateServerConfig(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
        });

        it('should return 400 if description or rules missing', async () => {
            req.body = { description: 'test' }; // Missing rules
            await serverConfigController.updateServerConfig(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
        });

        it('should update existing config and save', async () => {
            req.body = { description: 'new desc', rules: 'new rules' };
            const existingConfig = new MockServerConfig({
                serverName: 'server.local',
                description: 'old desc',
                rules: 'old rules'
            });
            ServerConfig.findOne.mockResolvedValueOnce(existingConfig);

            await serverConfigController.updateServerConfig(req, res, next);

            expect(existingConfig.description).toBe('new desc');
            expect(mockConfigSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                config: expect.objectContaining({ description: 'new desc', rules: 'new rules' })
            }));
        });

        it('should create new config and save if missing', async () => {
            req.body = { description: 'first desc', rules: 'first rules' };
            ServerConfig.findOne.mockResolvedValueOnce(null);

            await serverConfigController.updateServerConfig(req, res, next);

            expect(mockConfigSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                config: expect.objectContaining({ description: 'first desc', rules: 'first rules' })
            }));
        });
    });
});
