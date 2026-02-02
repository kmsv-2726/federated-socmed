import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      federatedId: decoded.federatedId,
      displayName: decoded.displayName,
      server: decoded.serverName,
      image: decoded.image,
      role: decoded.role
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Authentication failed" });
  }
};
