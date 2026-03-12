import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createError } from "../utils/error.js";

export const loginUser = async (req, res, next) => {
  try {
    const { displayName, email, password } = req.body;
    if ((!displayName && !email) || !password) {
      return next(createError(400, "Missing credentials"));
    }

    const user = await User.findOne({
      serverName: process.env.SERVER_NAME,
      isRemote: false,
      $or: [{ displayName }, { email }]
    });

    if (!user) {
      return next(createError(401, "Invalid credentials"));
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return next(createError(401, "Invalid credentials"));
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        serverName: user.serverName,
        federatedId: user.federatedId,
        displayName: user.displayName,
        image: user.avatarUrl
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await ActivityLog.create({
      userId: user._id,
      username: user.displayName,
      federatedId: user.federatedId,
      action: "LOGIN"
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        displayName: user.displayName,
        image: user.avatarUrl,
        bannerUrl: user.bannerUrl,
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
    const {
      displayName, firstName, lastName, dob, email, password } = req.body;

    if (
      !displayName || !firstName || !lastName || !dob || !email || !password
    ) {
      return next(createError(400, "All required fields must be provided"));
    }

    const existingUser = await User.findOne({
      serverName: process.env.SERVER_NAME,
      $or: [{ email }, { displayName }]
    });

    if (existingUser) {
      return next(createError(409, "User already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const federatedId = `${displayName}@${process.env.SERVER_NAME}`;

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
        image: null
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
        image: newUser.avatarUrl,
        bannerUrl: newUser.bannerUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const user = req.user; // Assuming auth middleware attach user
    if (user) {
      await ActivityLog.create({
        userId: user.userId || user.id,
        username: user.displayName,
        federatedId: user.federatedId,
        action: "LOGOUT"
      });
    }
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

export const unlockAccount = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isSuspended: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "Account successfully unlocked!" });
  } catch (err) {
    next(err);
  }
};
