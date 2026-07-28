import { S3Client } from "@aws-sdk/client-s3";
import "dotenv/config";
import Logger from "../utils/logger.js";

let s3Client = null;

if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  Logger.debug("Kredensial R2 belum lengkap. Fitur upload cloud mungkin gagal.", "R2_CONFIG");
}

export { s3Client };
