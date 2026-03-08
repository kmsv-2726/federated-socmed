import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.serverName !== process.env.SERVER_NAME) {
      return res.status(401).json({ message: "Invalid token origin" });
    }

    const user = await User.findById(decoded.userId).select("tokenVersion");
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    req.user = {
      userId: decoded.userId,
      federatedId: decoded.federatedId,
      displayName: decoded.displayName,
      serverName: decoded.serverName,
      role: decoded.role,
      image: decoded.image,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Authentication failed" });
  }
};
