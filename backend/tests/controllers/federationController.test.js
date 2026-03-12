import { jest } from '@jest/globals';

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn(),
        readFileSync: jest.fn()
    }
}));

jest.unstable_mockModule('axios', () => ({
    default: {
        get: jest.fn()
    }
}));

const mockTrustedServerSave = jest.fn().mockResolvedValue(true);
class MockTrustedServer {
    constructor(data) {
        Object.assign(this, data);
    }
    async save() {
        mockTrustedServerSave(this);
        return this;
    }
}
MockTrustedServer.findOne = jest.fn();
MockTrustedServer.find = jest.fn();
MockTrustedServer.findById = jest.fn();
MockTrustedServer.findByIdAndDelete = jest.fn();

jest.unstable_mockModule('../../models/TrustedServer.js', () => ({
    default: MockTrustedServer
}));

jest.unstable_mockModule('../../utils/error.js', () => ({
    createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

const fs = (await import('fs')).default;
const axios = (await import('axios')).default;
const TrustedServer = (await import('../../models/TrustedServer.js')).default;
const federationController = await import('../../controllers/federationController.js');

describe('Federation Controller', () => {
    let req, res, next;

    beforeEach(() => {
        process.env.SERVER_NAME = 'server.local';
        process.env.SERVER_URL = 'http://server.local';
        
        req = {
            body: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getPublicKey', () => {
        it('should return 500 if public key file does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            
            federationController.getPublicKey(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Public key not found" });
        });

        it('should return the public key successfully', () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('mock-public-key');
            
            federationController.getPublicKey(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                serverName: 'server.local',
                serverUrl: 'http://server.local',
                algorithm: 'RSA-SHA256',
                publicKey: 'mock-public-key'
            });
        });

        it('should handle fs errors via next', () => {
            fs.existsSync.mockImplementation(() => { throw new Error('fs error'); });
            
            federationController.getPublicKey(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 500, message: "Failed to retrieve public key" }));
        });
    });

    describe('addTrustedServer', () => {
        it('should fail if serverUrl is missing', async () => {
            await federationController.addTrustedServer(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: "serverUrl is required" }));
        });

        it('should fail if remote server is unreachable', async () => {
            req.body = { serverUrl: 'http://remote.local' };
            axios.get.mockRejectedValue(new Error('Network error'));
            
            await federationController.addTrustedServer(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: expect.stringContaining("reach remote server") }));
        });

        it('should fail if remote server returns invalid payload', async () => {
            req.body = { serverUrl: 'http://remote.local' };
            axios.get.mockResolvedValue({ data: { serverName: 'remote.local' } }); // missing publicKey
            
            await federationController.addTrustedServer(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: "Remote server returned invalid public key payload" }));
        });

        it('should fail if adding self as trusted server', async () => {
            req.body = { serverUrl: 'http://server.local' };
            axios.get.mockResolvedValue({ data: { serverName: 'server.local', publicKey: 'key' } });
            
            await federationController.addTrustedServer(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400, message: "Cannot add self as trusted server" }));
        });

        it('should update existing server if already exists', async () => {
            req.body = { serverUrl: 'http://remote.local' };
            axios.get.mockResolvedValue({ data: { serverName: 'remote.local', publicKey: 'new-key' } });
            
            const existingServer = { serverName: 'remote.local', serverUrl: 'http://old.local', publicKey: 'old-key', save: jest.fn().mockResolvedValue(true) };
            TrustedServer.findOne.mockResolvedValue(existingServer);
            
            await federationController.addTrustedServer(req, res, next);
            
            expect(existingServer.serverUrl).toBe('http://remote.local');
            expect(existingServer.publicKey).toBe('new-key');
            expect(existingServer.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Trusted server updated" }));
        });

        it('should save a new trusted server', async () => {
            req.body = { serverUrl: 'http://remote.local' };
            axios.get.mockResolvedValue({ data: { serverName: 'remote.local', publicKey: 'remote-key' } });
            TrustedServer.findOne.mockResolvedValue(null);
            
            await federationController.addTrustedServer(req, res, next);
            
            expect(mockTrustedServerSave).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Trusted server added successfully", trustedServer: expect.any(Object) }));
        });
    });

    describe('getTrustedServers', () => {
        it('should return list of trusted servers', async () => {
            TrustedServer.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ serverName: 'remote.local' }]) });
            
            await federationController.getTrustedServers(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ success: true, trustedServers: [{ serverName: 'remote.local' }] });
        });
    });

    describe('toggleTrustedServer', () => {
        it('should fail if trusted server not found', async () => {
            req.params.id = 'ts123';
            TrustedServer.findById.mockResolvedValue(null);
            
            await federationController.toggleTrustedServer(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
        });

        it('should toggle server from active to paused', async () => {
            req.params.id = 'ts123';
            const server = { serverName: 'remote.local', isActive: true, save: jest.fn().mockResolvedValue(true) };
            TrustedServer.findById.mockResolvedValue(server);
            
            await federationController.toggleTrustedServer(req, res, next);
            
            expect(server.isActive).toBe(false);
            expect(server.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("paused") }));
        });
    });

    describe('removeTrustedServer', () => {
        it('should fail if server not found', async () => {
            req.params.id = 'ts123';
            TrustedServer.findByIdAndDelete.mockResolvedValue(null);
            
            await federationController.removeTrustedServer(req, res, next);
            
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
        });

        it('should remove server successfully', async () => {
            req.params.id = 'ts123';
            TrustedServer.findByIdAndDelete.mockResolvedValue({ _id: 'ts123' });
            
            await federationController.removeTrustedServer(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Trusted server removed successfully" }));
        });
    });
});
