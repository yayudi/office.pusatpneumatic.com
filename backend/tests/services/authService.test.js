// backend/tests/services/authService.test.js
import { jest } from "@jest/globals";

// ============================================================================
// 1. MOCK SETUP (Must be defined BEFORE imports)
// ============================================================================

const mockDbConnection = {};

// Mock db config
jest.unstable_mockModule("../../config/db.js", () => ({
  default: mockDbConnection,
}));

// Mock bcryptjs
jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
  },
}));

// Mock jsonwebtoken
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  },
}));

// Mock userRepository
jest.unstable_mockModule("../../repositories/userRepository.js", () => ({
  getUserByUsername: jest.fn(),
  getRoleAndPermissions: jest.fn(),
}));

// Mock systemLogRepository
jest.unstable_mockModule("../../repositories/systemLogRepository.js", () => ({
  createLog: jest.fn(),
}));

// Mock Logger
jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: {
    error: jest.fn(),
  },
}));

// ============================================================================
// 2. IMPORT MODULES UNDER TEST
// ============================================================================

const bcrypt = (await import("bcryptjs")).default;
const jwt = (await import("jsonwebtoken")).default;
const userRepo = await import("../../repositories/userRepository.js");
const logRepo = await import("../../repositories/systemLogRepository.js");
const AppError = (await import("../../utils/AppError.js")).default;
const { loginService } = await import("../../services/authService.js");

// ============================================================================
// 3. TEST SUITE
// ============================================================================

describe("Auth Service - loginService", () => {
  const dummyIp = "192.168.1.1";
  const dummyUserAgent = "Mozilla/5.0";
  const mockUser = {
    id: 1,
    username: "testuser",
    password_hash: "hashed_password",
    role_id: 2,
  };
  const mockRoleAndPerms = {
    role: "Admin",
    permissions: ["manage-users", "view-reports"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";
  });

  test("Success: Should return token and user payload on correct credentials", async () => {
    userRepo.getUserByUsername.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    userRepo.getRoleAndPermissions.mockResolvedValue(mockRoleAndPerms);
    jwt.sign.mockReturnValue("mocked_jwt_token");

    const result = await loginService("testuser", "correct_password", dummyIp, dummyUserAgent);

    expect(result).toHaveProperty("token", "mocked_jwt_token");
    expect(result).toHaveProperty("user");
    expect(result.user).toMatchObject({
      id: mockUser.id,
      username: mockUser.username,
      role: mockRoleAndPerms.role,
      role_id: mockUser.role_id,
      permissions: mockRoleAndPerms.permissions,
    });

    expect(logRepo.createLog).toHaveBeenCalledWith(
      mockDbConnection,
      expect.objectContaining({
        userId: mockUser.id,
        action: "LOGIN",
        ip: dummyIp,
      })
    );
  });

  test("Fail: Should throw AppError 401 if user not found", async () => {
    userRepo.getUserByUsername.mockResolvedValue(null);

    await expect(
      loginService("wronguser", "password123", dummyIp, dummyUserAgent)
    ).rejects.toThrow(AppError);
    
    await expect(
      loginService("wronguser", "password123", dummyIp, dummyUserAgent)
    ).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "AUTH_FAILED"
    });
  });

  test("Fail: Should throw AppError 500 if user has no password_hash", async () => {
    userRepo.getUserByUsername.mockResolvedValue({ ...mockUser, password_hash: null });

    await expect(
      loginService("testuser", "password123", dummyIp, dummyUserAgent)
    ).rejects.toThrow("Konfigurasi akun error. Hubungi administrator.");

    await expect(
      loginService("testuser", "password123", dummyIp, dummyUserAgent)
    ).rejects.toMatchObject({
      statusCode: 500,
      errorCode: "CONFIG_ERROR"
    });
  });

  test("Fail: Should throw AppError 401 if password does not match", async () => {
    userRepo.getUserByUsername.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      loginService("testuser", "wrong_password", dummyIp, dummyUserAgent)
    ).rejects.toThrow("Password salah");

    await expect(
      loginService("testuser", "wrong_password", dummyIp, dummyUserAgent)
    ).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "AUTH_FAILED"
    });
  });
});
