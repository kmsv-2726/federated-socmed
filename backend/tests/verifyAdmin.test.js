import { jest } from "@jest/globals";

// mock createError BEFORE importing the middleware
jest.unstable_mockModule("../utils/error.js", () => ({
  createError: jest.fn((status, message) => ({
    status,
    message
  }))
}));

// import after mocking
const { verifyAdmin } = await import("../middleware/verifyAdmin.js");
const { createError } = await import("../utils/error.js");

describe("verifyAdmin middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  test("returns 401 if user is not authenticated", () => {
    verifyAdmin(req, res, next);

    expect(createError).toHaveBeenCalledWith(
      401,
      "Authentication required"
    );
    expect(next).toHaveBeenCalledWith(expect.any(Object));
  });

  test("returns 403 if user is not admin", () => {
    req.user = { role: "user" };

    verifyAdmin(req, res, next);

    expect(createError).toHaveBeenCalledWith(
      403,
      "You are not authorized!"
    );
    expect(next).toHaveBeenCalledWith(expect.any(Object));
  });

  test("calls next without error if user is admin", () => {
    req.user = { role: "admin" };

    verifyAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
