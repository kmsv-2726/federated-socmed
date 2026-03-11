import { jest } from "@jest/globals";

// Use plain factory functions — jest.fn() inside factory is unreliable in ESM/VM mode
jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findOne: jest.fn()
  }
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn()
  }
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn()
  }
}));

jest.unstable_mockModule("../utils/error.js", () => ({
  createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

jest.unstable_mockModule("../services/emailService.js", () => ({
  sendUnlockEmail: jest.fn().mockResolvedValue(true)
}));

const User = (await import("../models/User.js")).default;
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const { loginUser } = await import("../controllers/AuthController.js");

describe("loginUser controller (unit test)", () => {
  let req, res, next;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.SERVER_NAME = "TestServer";
    process.env.JWT_EXPIRES_IN = "1h";

    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
    // Re-apply implementations cleared by clearAllMocks
    jwt.sign.mockReturnValue("mock-token");
  });

  test("returns 400 if credentials are missing", async () => {
    req.body = { password: "pass123" }; // no displayName or email

    await loginUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ status: 400, message: "Missing credentials" });
  });

  test("returns 401 if user is not found", async () => {
    req.body = { email: "nobody@test.com", password: "pass123" };
    User.findOne.mockResolvedValue(null);

    await loginUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ status: 401, message: "Invalid credentials" });
  });

  test("returns 401 if password is incorrect", async () => {
    req.body = { email: "test@test.com", password: "wrongpass" };
    User.findOne.mockResolvedValue({
      _id: "uid1",
      email: "test@test.com",
      password: "hashed",
      isActive: true,
      failedLoginAttempts: 0,
      save: jest.fn()
    });
    bcrypt.compare.mockResolvedValue(false);

    await loginUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(401);
  });

  test("returns 403 if account is locked", async () => {
    req.body = { email: "locked@test.com", password: "anypass" };
    User.findOne.mockResolvedValue({
      _id: "uid2",
      email: "locked@test.com",
      password: "hashed",
      isActive: false,
      failedLoginAttempts: 5,
      save: jest.fn()
    });

    await loginUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ status: 403 });
  });

  test("returns token and user data if login is successful", async () => {
    req.body = { email: "test@test.com", password: "correctpass" };
    const mockUser = {
      _id: "uid3",
      email: "test@test.com",
      displayName: "Test User",
      role: "user",
      serverName: "TestServer",
      federatedId: "Test User@TestServer",
      avatarUrl: "img.png",
      bannerUrl: null,
      password: "hashed",
      isActive: true,
      failedLoginAttempts: 0,
      tokenVersion: 0,
      save: jest.fn()
    };
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    await loginUser(req, res, next);

    expect(jwt.sign).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: "mock-token",
        user: expect.objectContaining({ displayName: "Test User" })
      })
    );
  });
});