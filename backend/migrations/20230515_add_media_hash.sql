-- Migration: Add hash column and unique index to media_assets
-- Run this script on your MySQL database
ALTER TABLE media_assets
  ADD COLUMN hash VARCHAR(64) NULL AFTER tags,
  ADD COLUMN duplicate_of INT UNSIGNED NULL AFTER hash,
  ADD CONSTRAINT fk_media_duplicate FOREIGN KEY (duplicate_of) REFERENCES media_assets(id) ON DELETE SET NULL;

-- Ensure hash uniqueness for deduplication
CREATE UNIQUE INDEX idx_media_hash_unique ON media_assets(hash);
