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

jest.unstable_mockModule("../../repositories/stickerTemplateRepository.js", () => ({
  getAllTemplates: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
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
const { fetchAllTemplates, createTemplate } = await import("../../services/stickerTemplateService.js");
const cacheModule = await import("../../config/cache.js");
const repo = await import("../../repositories/stickerTemplateRepository.js");
const firebaseSignalService = await import("../../services/firebaseSignalService.js");

describe("stickerTemplateService Caching Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchAllTemplates", () => {
    it("should return data from cache if cache exists, bypassing database", async () => {
      const mockCachedData = [{ id: 1, name: "Template 1" }];
      
      cacheModule.default.has.mockReturnValue(true);
      cacheModule.default.get.mockReturnValue(mockCachedData);

      const result = await fetchAllTemplates();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_STICKER_TEMPLATES");
      expect(cacheModule.default.get).toHaveBeenCalledWith("MASTER_STICKER_TEMPLATES");
      expect(repo.getAllTemplates).not.toHaveBeenCalled();
      expect(result).toEqual(mockCachedData);
    });

    it("should fetch from database, parse JSON, and set cache if cache does not exist", async () => {
      const mockDbData = [{ id: 1, name: "Template 1", config_json: '{"key":"value"}' }];
      
      cacheModule.default.has.mockReturnValue(false);
      repo.getAllTemplates.mockResolvedValue(mockDbData);

      const result = await fetchAllTemplates();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_STICKER_TEMPLATES");
      expect(repo.getAllTemplates).toHaveBeenCalled();
      expect(cacheModule.default.set).toHaveBeenCalledWith("MASTER_STICKER_TEMPLATES", [
        { id: 1, name: "Template 1", config_json: { key: "value" } }
      ]);
    });
  });

  describe("createTemplate", () => {
    it("should invalidate cache and emit Firebase signal after successful creation", async () => {
      const input = {
        name: "New Template",
        paper_size: "80x40",
        config_json: { test: true }
      };
      
      repo.createTemplate.mockResolvedValue(99);

      await createTemplate(input);

      expect(cacheModule.default.del).toHaveBeenCalledWith("MASTER_STICKER_TEMPLATES");
      expect(firebaseSignalService.emitSharedTaskSignal).toHaveBeenCalledWith("MASTER_DATA", "REFRESH_STICKER_TEMPLATES");
    });
  });
});
