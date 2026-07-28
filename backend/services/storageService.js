import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/r2.js";
import crypto from "crypto";
import Logger from "../utils/logger.js";

/**
 * Service untuk mengelola interaksi dengan Cloudflare R2
 */
export const storageService = {
  /**
   * Men-generate Presigned URL agar Frontend bisa upload langsung ke R2
   * @param {string} originalName - Nama file asli
   * @param {string} mimeType - Content-Type file (e.g. image/jpeg)
   * @param {string} folder - Folder tujuan (e.g. 'profiles', 'products')
   * @returns {Promise<{url: string, key: string, publicUrl: string}|null>}
   */
  generatePresignedUploadUrl: async (originalName, mimeType, folder = "uploads") => {
    if (!s3Client) {
      throw new Error("S3 Client belum diinisialisasi. Periksa kredensial R2.");
    }

    try {
      // Generate nama file unik agar tidak bentrok
      const ext = originalName.split(".").pop();
      const randomString = crypto.randomUUID();
      const timestamp = Date.now();
      const uniqueFileName = `${folder}/${timestamp}-${randomString}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: uniqueFileName,
        ContentType: mimeType,
      });

      // URL valid selama 5 menit
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

      // Hitung URL publik berdasarkan custom domain
      const publicUrl = `${process.env.R2_PUBLIC_URL}/${uniqueFileName}`;

      return {
        url: signedUrl,
        key: uniqueFileName,
        publicUrl: publicUrl,
      };
    } catch (error) {
      Logger.error("Gagal membuat presigned URL", error, "STORAGE_SERVICE");
      return null;
    }
  },

  /**
   * Menghapus object dari Cloudflare R2
   * @param {string} key - R2 Object Key (e.g. 'main/filename.webp')
   * @returns {Promise<boolean>}
   */
  deleteFromR2: async (key) => {
    if (!s3Client) {
      Logger.warn("S3 Client belum diinisialisasi. Lewati penghapusan dari R2.", "STORAGE_SERVICE");
      return false;
    }
    if (!key) return false;

    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch (error) {
      Logger.error(`Gagal menghapus file dari R2: ${key}`, error, "STORAGE_SERVICE");
      return false;
    }
  }
};
