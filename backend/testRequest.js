import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const runSearch = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const query = 'admin';
        const parsedQuery = query.split(':')[0].trim();

        const users = await User.find(
            { displayName: { $regex: new RegExp(parsedQuery, 'i') } },
            { displayName: 1, avatarUrl: 1, serverName: 1, _id: 1, federatedId: 1 }
        ).limit(10);

        console.log("Found users:", users);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runSearch();
