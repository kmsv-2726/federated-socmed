import { jest } from '@jest/globals';

const mockSendMail = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransport: jest.fn().mockReturnValue({
            sendMail: mockSendMail
        })
    }
}));

const nodemailer = (await import('nodemailer')).default;
const emailService = await import('../../services/emailService.js');

describe('Email Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully send an unlock email', async () => {
        await emailService.sendUnlockEmail('test@example.com', 'dummy_token_123');

        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@example.com',
            subject: 'Security Alert: Your Account Has Been Locked',
            html: expect.stringContaining('dummy_token_123')
        }));
    });

    it('should throw error if sendMail fails', async () => {
        const testError = new Error('SMTP Error');
        mockSendMail.mockRejectedValueOnce(testError);

        await expect(emailService.sendUnlockEmail('test@example.com', 'dummy_token_123'))
            .rejects.toThrow('SMTP Error');
    });
});
