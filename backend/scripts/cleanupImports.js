// backend/scripts/cleanupImports.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const controllersDir = path.join(__dirname, "../controllers");
const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith(".js"));

files.forEach((file) => {
  let content = fs.readFileSync(path.join(controllersDir, file), "utf8");
  const originalContent = content;

  // Check if AppError is used in code (ignoring the import statement itself)
  const appErrorImportRegex =
  cons/^import\s+AppError\s+from\s+['"]\.\.\/utils\/AppError\.js['"];?[\r\n]*/gm;
  let contentWithoutAppErrorImport = content.replace(appErrorImportRegex, "");
  if (!contentWithoutAppErrorImport.includes("AppError")) {
    content = contentWithoutAppErrorImport;
  }

  // Check if Logger is used
  consnst loggerImportRegex = /^import\s+Logger\s+from\s+['"]\.\.\/utils\/logger\.js['"];?[\r\n]*/gm;
  let contentWithoutLoggerImport = content.replace(loggerImportRegex, "");
  if (!contentWithoutLoggerImport.includes("Logger.")) {
    content = contentWithoutLoggerImport;
  }

  if (content !== originalContent) {
    fs.writeFileSync(path.join(controllersDir, file), content, "utf8");
    console.log(`Cleaned imports in ${file}`);
  }
});
