import { jest } from "@jest/globals";

/* ---------------- MOCKS (MUST BE FIRST) ---------------- */

jest.unstable_mockModule("../models/User.js", () => ({
  default: jest.fn()
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn()
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

/* ---------------- IMPORT AFTER MOCKING ---------------- */

const { registerUser } = await import("../controllers/authController.js");
const User = (await import("../models/User.js")).default;
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const { createError } = await import("../utils/error.js");

/* ---------------- TESTS ---------------- */

describe("registerUser controller (unit test)", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();

    process.env.SERVER_NAME = "testServer";
    process.env.JWT_SECRET = "secret";
    process.env.JWT_EXPIRES_IN = "1d";
  });

  test("returns 400 if required fields are missing", async () => {
    req.body = {
      displayName: "testuser",
      email: "test@test.com"
    };

    await registerUser(req, res, next);

    expect(createError).toHaveBeenCalledWith(
      400,
      "All required fields must be provided"
    );
    expect(next).toHaveBeenCalledWith(expect.any(Object));
  });

  test("returns 409 if user already exists", async () => {
    req.body = {
      displayName: "testuser",
      firstName: "Test",
      lastName: "User",
      dob: "2000-01-01",
      email: "test@test.com",
      password: "password"
    };

    User.findOne = jest.fn().mockResolvedValue({ email: "test@test.com" });

    await registerUser(req, res, next);

    expect(createError).toHaveBeenCalledWith(409, "User with this email, or display name already exists");
    expect(next).toHaveBeenCalledWith(expect.any(Object));
  });

  test("registers user successfully and returns token", async () => {
    const mockSavedUser = {
      _id: "123",
      displayName: "testuser",
      email: "test@test.com",
      role: "user",
      federatedId: "testuser@testServer",
      serverName: "testServer"
    };

    req.body = {
      displayName: "testuser",
      firstName: "Test",
      lastName: "User",
      dob: "2000-01-01",
      email: "test@test.com",
      password: "password"
    };

    User.findOne = jest.fn().mockResolvedValue(null);

    bcrypt.hash.mockResolvedValue("hashedpassword");

    User.prototype.save = jest.fn().mockResolvedValue(mockSavedUser);

    jwt.sign.mockReturnValue("fake-jwt-token");

    await registerUser(req, res, next);

    expect(bcrypt.hash).toHaveBeenCalled();
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
