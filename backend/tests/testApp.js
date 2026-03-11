import express from 'express';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret';

/**
 * Creates a test Express app with full social routes and a mock auth middleware.
 * Must be async because route modules need mocks to be resolved first.
 */
export const createTestApp = async () => {
    const app = express();
    app.use(express.json({ limit: '50mb' }));

    // Mock Auth Middleware
    app.use((req, res, next) => {
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, TEST_SECRET);
                req.user = decoded;
            } catch (err) {
                return res.status(401).json({ success: false, message: 'Authentication failed' });
            }
        }
        next();
    });

    // Dynamically import routes AFTER mocks are set up
    const postRoute = (await import('../routes/postRoute.js')).default;
    const userRoute = (await import('../routes/userRoute.js')).default;

    app.use('/api/posts', postRoute);
    app.use('/api/user', userRoute);

    // Error handler
    app.use((err, req, res, next) => {
        const status = err.status || 500;
        const message = err.message || 'Something went wrong';
        res.status(status).json({ success: false, message });
    });

    return app;
};

/**
 * Generates a mock JWT token for tests.
 */
export const generateToken = (userData) => {
    return jwt.sign(userData, TEST_SECRET, { expiresIn: '1h' });
};