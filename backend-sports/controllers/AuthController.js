import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createError } from "../utils/error.js";
import crypto from "crypto";
import { sendUnlockEmail } from "../services/emailService.js";

export const unlockAccount = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return next(createError(400, "Unlock token is required"));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      unlockToken: hashedToken,
      unlockTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return next(createError(400, "Invalid or expired unlock token"));
    }

    user.isActive = true;
    user.failedLoginAttempts = 0;
    user.unlockToken = null;
    user.unlockTokenExpiry = null;
    user.tokenVersion += 1; // Invalidate any rogue active sessions

    await user.save();

    res.status(200).json({
      success: true,
      message: "Your account has been successfully unlocked."
    });

  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, displayName, password } = req.body;
    const identifier = email || displayName;
    if (!identifier || !password) {
      return next(createError(400, "Missing credentials"));
    }

    console.log(`[Auth-Sports] Login attempt for identifier: "${identifier}" on server: "${process.env.SERVER_NAME}"`);

    const user = await User.findOne({
      serverName: process.env.SERVER_NAME,
      isRemote: false,
      $or: [
        { displayName: { $regex: new RegExp(`^${identifier}$`, "i") } },
        { email: identifier.toLowerCase() }
      ]
    });

    if (!user) {
      console.warn(`[Auth-Sports] User not found for identifier: "${identifier}"`);
      return next(createError(401, "Invalid credentials"));
    }

    console.log(`[Auth-Sports] Found user: "${user.displayName}". Active: ${user.isActive}. Failed attempts: ${user.failedLoginAttempts}`);

    if (!user.isActive) {
      return next(createError(403, "Account is locked or inactive due to multiple failed login attempts. Please check your email for unlock instructions."));
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 5) {
        user.isActive = false;

        // Generate a secure random hex token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.unlockToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.unlockTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour expiry

        await user.save();

        // Dispatch email asynchronously
        sendUnlockEmail(user.email, resetToken).catch(err => {
          console.error("Failed to send unlock email:", err);
        });

        return next(createError(403, "Maximum login attempts reached. Your account has been temporarily locked. Check your email to regain access."));
      }

      await user.save();
      return next(createError(401, `Invalid credentials. You have ${5 - user.failedLoginAttempts} attempts remaining.`));
    }

    // Reset attempts on successful login
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      await user.save();
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        serverName: user.serverName,
        federatedId: user.federatedId,
        displayName: user.displayName,
        image: user.avatarUrl,
        tokenVersion: user.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        displayName: user.displayName,
        image: user.avatarUrl,
        email: user.email,
        role: user.role,
        federatedId: user.federatedId,
        serverName: user.serverName
      }
    });
  } catch (err) {
    next(err);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const { displayName, firstName, lastName, dob, email, password } = req.body;

    if (
      !displayName || !firstName || !lastName || !dob || !email || !password
    ) {
      return next(createError(400, "All required fields must be provided"));
    }

    // Strip out all whitespace from displayName ONLY for federatedId generation
    const sanitizedDisplayName = displayName.replace(/\s+/g, '');
    const federatedId = `${sanitizedDisplayName}@${process.env.SERVER_NAME}`;

    const existingUser = await User.findOne({
      $or: [{ email }, { federatedId }]
    });

    if (existingUser) {
      return next(createError(409, "User with this email, or display name already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      displayName,
      firstName,
      lastName,
      dob,
      email,
      password: hashedPassword,
      serverName: process.env.SERVER_NAME,
      originServer: process.env.SERVER_NAME,
      isRemote: false,
      federatedId
    });

    await newUser.save();

    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
        serverName: newUser.serverName,
        federatedId: newUser.federatedId,
        displayName: newUser.displayName,
        image: null,
        tokenVersion: newUser.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        displayName: newUser.displayName,
        email: newUser.email,
        role: newUser.role,
        federatedId: newUser.federatedId,
        serverName: newUser.serverName,
        image: null
      }
    });
  } catch (err) {
    next(err);
  }
};

