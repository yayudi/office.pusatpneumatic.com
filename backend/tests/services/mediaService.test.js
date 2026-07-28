import { jest } from '@jest/globals';

// 1. Mock Repository
await jest.unstable_mockModule('../../repositories/mediaRepository.js', () => ({
  getMediaAssetByHash: jest.fn(),
  createMediaAsset: jest.fn()
}));

// 2. Import Module under test dynamically
const mediaRepo = await import('../../repositories/mediaRepository.js');
const { saveMediaMetadata } = await import('../../services/mediaService.js');

describe('Media Service - saveMediaMetadata', () => {
  let mockConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection = {}; // Mock object for MySQL connection
  });

  it('should throw a duplicate error if the hash already exists in the database', async () => {
    // Arrange: Mock DB returns an existing record
    mediaRepo.getMediaAssetByHash.mockResolvedValue({ id: 999 });

    const metadata = { hash: 'duplicate_hash_123' };
    const userId = 1;

    // Act & Assert
    await expect(saveMediaMetadata(metadata, userId, mockConnection))
      .rejects
      .toEqual({ isDuplicate: true, duplicateOf: 999 });

    expect(mediaRepo.getMediaAssetByHash).toHaveBeenCalledWith(mockConnection, 'duplicate_hash_123');
    expect(mediaRepo.createMediaAsset).not.toHaveBeenCalled(); // Should stop before creating
  });

  it('should save metadata and return the new media ID if hash is unique', async () => {
    // Arrange: Mock DB returns null (no duplicate) and then returns a new insertId
    mediaRepo.getMediaAssetByHash.mockResolvedValue(null);
    mediaRepo.createMediaAsset.mockResolvedValue(42);

    const metadata = {
      hash: 'unique_hash_456',
      title: 'New Product Image',
      mainPath: 'main/img.webp',
      thumbnailPath: 'thumb/img.webp',
      tags: ['promo', '2026'],
      sizeBytes: 2048,
      width: 1024,
      height: 768
    };
    const userId = 2;

    // Act
    const result = await saveMediaMetadata(metadata, userId, mockConnection);

    // Assert
    expect(result).toBe(42);
    expect(mediaRepo.getMediaAssetByHash).toHaveBeenCalledWith(mockConnection, 'unique_hash_456');
    expect(mediaRepo.createMediaAsset).toHaveBeenCalledWith(mockConnection, {
      title: 'New Product Image',
      mainPath: 'main/img.webp',
      thumbnailPath: 'thumb/img.webp',
      status: 'READY',
      uploaderId: 2,
      tags: ['promo', '2026'],
      hash: 'unique_hash_456',
      duplicateOf: null,
      sizeBytes: 2048,
      width: 1024,
      height: 768
    });
  });
});
