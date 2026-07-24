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

jest.unstable_mockModule("../../repositories/paperSizeRepository.js", () => ({
  getAllPaperSizes: jest.fn(),
  createPaperSize: jest.fn(),
  updatePaperSize: jest.fn(),
  deletePaperSize: jest.fn(),
  getPaperSizeById: jest.fn(),
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
const { getAllPaperSizes, createPaperSize } = await import("../../services/paperSizeService.js");
const cacheModule = await import("../../config/cache.js");
const repo = await import("../../repositories/paperSizeRepository.js");
const firebaseSignalService = await import("../../services/firebaseSignalService.js");

describe("paperSizeService Caching Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllPaperSizes", () => {
    it("should return data from cache if cache exists, bypassing database", async () => {
      const mockCachedData = [{ id: 1, name: "A4" }];
      
      cacheModule.default.has.mockReturnValue(true);
      cacheModule.default.get.mockReturnValue(mockCachedData);

      const result = await getAllPaperSizes();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_PAPER_SIZES");
      expect(cacheModule.default.get).toHaveBeenCalledWith("MASTER_PAPER_SIZES");
      expect(repo.getAllPaperSizes).not.toHaveBeenCalled();
      expect(result).toEqual(mockCachedData);
    });

    it("should fetch from database and set cache if cache does not exist", async () => {
      const mockDbData = [{ id: 1, name: "A4", top_margin: 0, side_margin: 0, vertical_pitch: 0, horizontal_pitch: 0, label_width: 0, label_height: 0, number_across: 1, number_down: 1, page_width: 0, page_height: 0, is_active: 1 }];
      
      cacheModule.default.has.mockReturnValue(false);
      repo.getAllPaperSizes.mockResolvedValue(mockDbData);

      const result = await getAllPaperSizes();

      expect(cacheModule.default.has).toHaveBeenCalledWith("MASTER_PAPER_SIZES");
      expect(repo.getAllPaperSizes).toHaveBeenCalled();
      expect(cacheModule.default.set).toHaveBeenCalledWith("MASTER_PAPER_SIZES", expect.anything());
    });
  });

  describe("createPaperSize", () => {
    it("should invalidate cache and emit Firebase signal after successful creation", async () => {
      const input = {
        name: "Test Size",
        topMargin: 0, sideMargin: 0, verticalPitch: 0, horizontalPitch: 0,
        labelWidth: 0, labelHeight: 0, numberAcross: 1, numberDown: 1,
        pageWidth: 0, pageHeight: 0
      };
      
      repo.createPaperSize.mockResolvedValue(99);
      // Wait, getPaperSizeById is called internally so mock its db call
      repo.getPaperSizeById.mockResolvedValue({ id: 99, name: "Test Size", top_margin: 0, side_margin: 0, vertical_pitch: 0, horizontal_pitch: 0, label_width: 0, label_height: 0, number_across: 1, number_down: 1, page_width: 0, page_height: 0, is_active: 1 });

      await createPaperSize(input);

      expect(cacheModule.default.del).toHaveBeenCalledWith("MASTER_PAPER_SIZES");
      expect(firebaseSignalService.emitSharedTaskSignal).toHaveBeenCalledWith("MASTER_DATA", "REFRESH_PAPER_SIZES");
    });
  });
});
