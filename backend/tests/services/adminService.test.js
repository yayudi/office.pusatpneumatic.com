import { jest } from "@jest/globals";

// 1. Mock dependencies
jest.unstable_mockModule("../../config/cache.js", () => ({
  default: {
    has: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.unstable_mockModule("../../repositories/adminRepository.js", () => ({
  findAllActiveUsers: jest.fn(),
  insertUser: jest.fn(),
}));

jest.unstable_mockModule("../../repositories/systemLogRepository.js", () => ({
  createLog: jest.fn(),
}));

jest.unstable_mockModule("../../config/db.js", () => ({
  default: {
    getConnection: jest.fn().mockResolvedValue({
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

jest.unstable_mockModule("../../services/firebaseSignalService.js", () => ({
  emitSharedTaskSignal: jest.fn().mockResolvedValue(true),
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// 2. Dynamic Import
const { getAllUsers, createUser } = await import("../../services/adminService.js");
const cacheModule = await import("../../config/cache.js");
const adminRepo = await import("../../repositories/adminRepository.js");
const firebaseSignalService = await import("../../services/firebaseSignalService.js");

describe("adminService Caching Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllUsers", () => {
    it("should return data from cache if cache exists, bypassing database", async () => {
      const mockCachedData = [{ id: 1, username: "admin" }];
      
      cacheModule.default.has.mockReturnValue(true);
      cacheModule.default.get.mockReturnValue(mockCachedData);

      const result = await getAllUsers();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_USERS_ACTIVE");
      expect(cacheModule.default.get).toHaveBeenCalledWith("MASTER_USERS_ACTIVE");
      expect(adminRepo.findAllActiveUsers).not.toHaveBeenCalled();
      expect(result).toEqual(mockCachedData);
    });

    it("should fetch from database and set cache if cache does not exist", async () => {
      const mockDbData = [{ id: 1, username: "admin" }];
      
      cacheModule.default.has.mockReturnValue(false);
      adminRepo.findAllActiveUsers.mockResolvedValue(mockDbData);

      const result = await getAllUsers();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_USERS_ACTIVE");
      expect(adminRepo.findAllActiveUsers).toHaveBeenCalled();
      expect(cacheModule.default.set).toHaveBeenCalledWith("MASTER_USERS_ACTIVE", mockDbData);
    });
  });

  describe("createUser", () => {
    it("should invalidate cache and emit Firebase signal after successful creation", async () => {
      adminRepo.insertUser.mockResolvedValue(100);

      const input = {
        adminId: 1,
        username: "newuser",
        password: "password",
        roleId: 2,
        nickname: "New User",
        shiftId: null,
        excludeFromAttendance: false,
        ip: "127.0.0.1",
        userAgent: "Jest",
      };

      await createUser(input);

      expect(cacheModule.default.del).toHaveBeenCalledWith("MASTER_USERS_ACTIVE");
      expect(firebaseSignalService.emitSharedTaskSignal).toHaveBeenCalledWith("MASTER_DATA", "REFRESH_USERS");
    });
  });
});
