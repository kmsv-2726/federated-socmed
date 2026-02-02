import User from "../models/User.js";
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
        server: process.env.SERVER_NAME,
        role: user.role,
        serverName: user.serverName, 
        federatedId: user.federatedId,
        displayName: user.displayName,
        image: user.image
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
        image: user.image,
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
      displayName,firstName,middleName,lastName,dob,email,password} = req.body;

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
      federatedId
    });

    await newUser.save();

    const token = jwt.sign(
      {
        userId: newUser._id,
        server: process.env.SERVER_NAME,
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
        image: null
      }
    });
  } catch (err) {
    next(err);
  }
};
