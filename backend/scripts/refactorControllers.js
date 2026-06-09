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

  // Add AppError import if not exists
  if (!content.includes("import AppError")) {
    const importRegex = /^import\s+.*?;?\s*$/gm;
    let match;
    let lastImportIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    if (lastImportIndex > 0) {
      content =
        content.slice(0, lastImportIndex) +
        '\nimport AppError from "../utils/AppError.js";' +
        content.slice(lastImportIndex);
    } else {
      content = 'import AppError from "../utils/AppError.js";\n' + content;
    }
  }

  // Replace `(req, res) =>` with `(req, res, next) =>`
  content = content.replace(/async\s*\(\s*req\s*,\s*res\s*\)\s*=>/g, "async (req, res, next) =>");

  // Safely replace simple catch blocks
  // Matches:
  // catch (error) {
  //   Logger.error(...);
  //   res.status(...).json(...);
  // }
  // Will NOT match if there's an `if` statement or other logic.
  const simpleCatchRegex =
    /catch\s*\(([^)]+)\)\s*\{\s*(?:Logger\.error\([^;]+\);?\s*)?(?:return\s+)?res\.status\(\d+\)\.json\([^)]+\);?\s*\}/g;

  content = content.replace(simpleCatchRegex, "catch ($1) {\n    next($1);\n  }");

  if (content !== originalContent) {
    fs.writeFileSync(path.join(controllersDir, file), content, "utf8");
    console.log(`Refactored ${file}`);
  }
});
