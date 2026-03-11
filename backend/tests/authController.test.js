import { jest } from "@jest/globals";

/* -------------------- MOCKS (MUST BE FIRST) -------------------- */

jest.unstable_mockModule("../models/User.js", () => ({
  default: {
    findOne: jest.fn()
  }
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: jest.fn()
  }
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn()
  }
}));

jest.unstable_mockModule("../utils/error.js", () => ({
  createError: jest.fn((status, message) => ({
    status,
    message
  }))
}));

/* -------------------- IMPORT AFTER MOCKING -------------------- */

const { loginUser } = await import("../controllers/authController.js");
const User = (await import("../models/User.js")).default;
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const { createError } = await import("../utils/error.js");

/* -------------------- TESTS -------------------- */

describe("loginUser controller (unit test)", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();

    process.env.SERVER_NAME = "testServer";
    process.env.JWT_SECRET = "secret";
    process.env.JWT_EXPIRES_IN = "1d";
  });

  test("returns 400 if credentials are missing", async () => {
    req.body = { password: "123456" };

    await loginUser(req, res, next);

    expect(createError).toHaveBeenCalledWith(400, "Missing credentials");
    expect(next).toHaveBeenCalledWith(expect.any(Object));
  });

  test("returns 401 if user is not found", async () => {
    req.body = {
      email: "test@test.com",
      password: "123456"
    };

    User.findOne.mockResolvedValue(null);

    await loginUser(req, res, next);

    expect(createError).toHaveBeenCalledWith(401, "Invalid credentials");
    expect(next).toHaveBeenCalledWith(expect.any(Object));
  });

  test("returns 401 if password is incorrect", async () => {
    req.body = {
      email: "test@test.com",
      password: "wrongpass"
    };

    User.findOne.mockResolvedValue({
      password: "hashedpassword"
    });

    bcrypt.compare.mockResolvedValue(false);

    await loginUser(req, res, next);

    expect(createError).toHaveBeenCalledWith(403, "Account is locked or inactive due to multiple failed login attempts. Please check your email for unlock instructions.");
    expect(next).toHaveBeenCalledWith(expect.any(Object));
  });

  test("returns token and user data if login is successful", async () => {
    const mockUser = {
      _id: "123",
      displayName: "TestUser",
      email: "test@test.com",
      password: "hashedpassword",
      role: "user",
      federatedId: "TestUser@testServer",
      serverName: "testServer",
      image: null
    };

    req.body = {
      email: "test@test.com",
      password: "correctpass"
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue("fake-jwt-token");

    await loginUser(req, res, next);

    expect(jwt.sign).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: "fake-jwt-token"
      })
    );
  });
});
