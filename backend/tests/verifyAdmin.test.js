import { jest } from "@jest/globals";

// Use plain function in factory — jest.fn() inside factory is unreliable in ESM/VM mode
jest.unstable_mockModule("../utils/error.js", () => ({
  createError: (status, message) => ({ status, message })
}));

const { verifyAdmin } = await import("../middleware/verifyAdmin.js");

describe("verifyAdmin middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  test("returns 401 if user is not authenticated", () => {
    verifyAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ status: 401, message: "Authentication required" });
  });

  test("returns 403 if user is not admin", () => {
    req.user = { role: "user" };

    verifyAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ status: 403, message: "You are not authorized!" });
  });

  test("calls next without error if user is admin", () => {
    req.user = { role: "admin" };

    verifyAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});