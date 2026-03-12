import { jest } from "@jest/globals";

// Mock User as constructor — save is set up fresh in beforeEach to survive clearAllMocks
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

// Plain function — not jest.fn() — avoids ESM/VM mock factory issue
jest.unstable_mockModule("../utils/error.js", () => ({
  createError: (status, message) => Object.assign(new Error(message), { status, message })
}));

jest.unstable_mockModule("../services/emailService.js", () => ({
  sendUnlockEmail: jest.fn().mockResolvedValue(true)
}));

const UserModule = await import("../models/User.js");
const User = UserModule.default;
const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const { registerUser } = await import("../controllers/AuthController.js");

describe("registerUser controller (unit test)", () => {
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
    bcrypt.hash.mockResolvedValue("hashed-password");
    jwt.sign.mockReturnValue("mock-token");
    // Re-setup User constructor so save() survives clearAllMocks
    User.mockImplementation(function (data) {
      Object.assign(this, {
        _id: "newuid",
        role: "user",
        tokenVersion: 0,
        avatarUrl: null,
        bannerUrl: null,
        save: jest.fn().mockResolvedValue(true),
        ...data
      });
    });
  });

  test("returns 400 if required fields are missing", async () => {
    req.body = { displayName: "TestUser", password: "pass" }; // missing firstName, lastName, dob, email

    await registerUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ status: 400, message: "All required fields must be provided" });
  });

  test("returns 409 if user already exists", async () => {
    req.body = {
      displayName: "TestUser",
      firstName: "Test",
      lastName: "User",
      dob: "2000-01-01",
      email: "test@test.com",
      password: "pass123"
    };

    // Mock User.findOne — since User is mocked as a constructor, we need to add static method
    User.findOne = jest.fn().mockResolvedValue({ _id: "existing" });

    await registerUser(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ status: 409, message: "User with this email, or display name already exists" });
  });

  test("registers user successfully and returns token", async () => {
    req.body = {
      displayName: "NewUser",
      firstName: "New",
      lastName: "User",
      dob: "2000-01-01",
      email: "new@test.com",
      password: "pass123"
    };

    User.findOne = jest.fn().mockResolvedValue(null); // No existing user

    await registerUser(req, res, next);

    expect(jwt.sign).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: "mock-token"
      })
    );
  });
});