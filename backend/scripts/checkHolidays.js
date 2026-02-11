
import { loadHolidays } from "../services/helpers/fileHelpers.js";
import db from "../config/db.js";

(async () => {
  try {
    console.log("Testing loadHolidays(2025)...");
    const holidays = await loadHolidays(2025);
    console.log("Holidays Map Keys:", Object.keys(holidays).length);
    if (holidays['2025-12-25']) {
      console.log("✅ Success: Christmas 2025 found in map!");
    } else {
      console.error("❌ Failed: Christmas 2025 NOT found.");
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
