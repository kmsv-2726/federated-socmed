import { jest } from "@jest/globals";

// Mock jsonwebtoken
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    verify: jest.fn()
  }
}));

// Mock User model
jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findById: jest.fn()
  }
}));

const jwt = (await import("jsonwebtoken")).default;
const User = (await import("../models/User.js")).default;
const { verifyToken } = await import("../middleware/verifyToken.js");

describe("verifyToken middleware", () => {
  let req, res, next;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.SERVER_NAME = "TestServer";
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test("returns 401 if Authorization header is missing", async () => {
    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Authentication failed" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 401 if token is invalid", async () => {
    req.headers.authorization = "Bearer badtoken";
    jwt.verify.mockImplementation(() => { throw new Error("invalid token"); });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Authentication failed" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("calls next and sets req.user if token is valid", async () => {
    req.headers.authorization = "Bearer validtoken";

    const decoded = {
      userId: "mongo123",
      federatedId: "123",
      displayName: "Test User",
      serverName: "TestServer",
      role: "user",
      image: "img.png",
      tokenVersion: 0
    };

    jwt.verify.mockReturnValue(decoded);
    // User.findById returns an object with .select() chained
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ tokenVersion: 0 })
    });

    await verifyToken(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      userId: "mongo123",
      federatedId: "123",
      displayName: "Test User",
      serverName: "TestServer",
      role: "user",
      image: "img.png"
    });
  });

  test("returns 401 if token version is stale (session expired)", async () => {
    req.headers.authorization = "Bearer staletoken";

    jwt.verify.mockReturnValue({
      userId: "mongo123",
      serverName: "TestServer",
      tokenVersion: 1
    });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ tokenVersion: 2 }) // DB version newer
    });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Session expired. Please log in again." })
    );
  });
});