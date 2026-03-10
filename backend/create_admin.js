import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to DB');
        
        // Ensure hkadmin exists and is admin
        let admin = await User.findOne({ displayName: 'hkadmin' });
        
        if (!admin) {
             const salt = await bcrypt.genSalt(10);
             const hashedPassword = await bcrypt.hash('password123', salt);
             admin = new User({
                displayName: 'hkadmin',
                firstName: 'HK',
                lastName: 'Admin',
                dob: new Date('2000-01-01'),
                email: 'hkadmin@example.com',
                password: hashedPassword,
                serverName: process.env.SERVER_NAME || 'LOCAL.SERVER',
                federatedId: `hkadmin@${process.env.SERVER_NAME || 'LOCAL.SERVER'}`,
                originServer: process.env.SERVER_NAME || 'LOCAL.SERVER',
                role: 'admin'
             });
             await admin.save();
             console.log('Admin user hkadmin created!');
        } else {
             admin.role = 'admin';
             await admin.save();
             console.log('Admin user hkadmin updated to role "admin"!');
        }
        
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();
