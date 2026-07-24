import { jest } from "@jest/globals";

// 1. Mock first
jest.unstable_mockModule("../../config/db.js", () => {
  return {
    default: {
      getConnection: jest.fn().mockResolvedValue({
        release: jest.fn(),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
      }),
    },
  };
});

jest.unstable_mockModule("../../utils/logger.js", () => {
  return {
    default: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  };
});

jest.unstable_mockModule("../../repositories/categoryRepository.js", () => {
  return {
    findAllCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };
});

jest.unstable_mockModule("../../services/firebaseSignalService.js", () => {
  return {
    emitSharedTaskSignal: jest.fn().mockResolvedValue(true),
  };
});

jest.unstable_mockModule("../../config/cache.js", () => {
  return {
    default: {
      has: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    },
  };
});

// 2. Dynamic Import
const { getAllCategories, createCategory } = await import("../../services/categoryService.js");
const cacheModule = await import("../../config/cache.js");
const categoryRepo = await import("../../repositories/categoryRepository.js");
const firebaseSignalService = await import("../../services/firebaseSignalService.js");

describe("categoryService Caching Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllCategories", () => {
    it("should return data from cache if cache exists, bypassing database", async () => {
      const mockCachedData = [{ id: 1, name: "Cached Category" }];
      
      // Mock cache behavior
      cacheModule.default.has.mockReturnValue(true);
      cacheModule.default.get.mockReturnValue(mockCachedData);

      const result = await getAllCategories();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_CATEGORIES");
      expect(cacheModule.default.get).toHaveBeenCalledWith("MASTER_CATEGORIES");
      expect(categoryRepo.findAllCategories).not.toHaveBeenCalled();
      expect(result).toEqual(mockCachedData);
    });

    it("should fetch from database and set cache if cache does not exist", async () => {
      const mockDbData = [{ id: 1, name: "DB Category" }];
      
      // Mock cache behavior
      cacheModule.default.has.mockReturnValue(false);
      
      // Mock DB behavior
      categoryRepo.findAllCategories.mockResolvedValue(mockDbData);

      const result = await getAllCategories();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_CATEGORIES");
      expect(categoryRepo.findAllCategories).toHaveBeenCalled();
      expect(cacheModule.default.set).toHaveBeenCalledWith("MASTER_CATEGORIES", mockDbData);
      expect(result).toEqual(mockDbData);
    });
  });

  describe("createCategory", () => {
    it("should invalidate cache and emit Firebase signal after successful creation", async () => {
      // Mock DB behavior
      categoryRepo.createCategory.mockResolvedValue(99);

      const result = await createCategory("New Category");

      expect(categoryRepo.createCategory).toHaveBeenCalledWith(expect.anything(), "New Category");
      
      // Cache invalidation and signal emit should be triggered
      expect(cacheModule.default.del).toHaveBeenCalledWith("MASTER_CATEGORIES");
      expect(firebaseSignalService.emitSharedTaskSignal).toHaveBeenCalledWith("MASTER_DATA", "REFRESH_CATEGORIES");
      
      expect(result).toEqual({ id: 99, name: "New Category" });
    });
  });
});
