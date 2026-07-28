import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storageService } from "../services/storageService.js";

// Setup path untuk ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testR2Connection = async () => {
  try {
    console.log("Memulai pengujian koneksi Cloudflare R2...");

    // 1. Resolve path absolut ke dpv_logo.png (mengacu pada Aturan Proyek #7 Worker Paths)
    const imagePath = path.resolve(__dirname, "../../frontend/public/dpv_logo.png");
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File tidak ditemukan di path: ${imagePath}`);
    }

    console.log("Membaca file logo...");
    const fileBuffer = fs.readFileSync(imagePath);
    const mimeType = "image/png";
    const fileName = "dpv_logo.png";

    // 2. Generate Presigned URL via Storage Service
    console.log("Meminta Presigned URL dari Backend...");
    const presignedData = await storageService.generatePresignedUploadUrl(fileName, mimeType, "test-folder");

    if (!presignedData || !presignedData.url) {
      throw new Error("Gagal men-generate Presigned URL. Periksa kredensial .env Anda.");
    }

    console.log(`Berhasil mendapatkan URL. Uploading ke R2...`);

    // 3. Simulasi Upload dari Frontend menggunakan Fetch API (Native Node.js)
    const uploadResponse = await fetch(presignedData.url, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload gagal! HTTP Status: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    console.log("\n✅ BERHASIL!");
    console.log(`Gambar Anda sekarang bisa diakses publik di:`);
    console.log(presignedData.publicUrl);

  } catch (error) {
    console.error("\n❌ GAGAL TES KONEKSI:");
    console.error(error.message);
  } finally {
    process.exit(0);
  }
};

testR2Connection();
