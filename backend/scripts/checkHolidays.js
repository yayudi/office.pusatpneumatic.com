import { loadHolidays } from "../services/helpers/fileHelpers.js";
import Logger from "../utils/logger.js";

(async () => {
  try {
    Logger.info("Testing loadHolidays(2025)...", "CHECK_HOLIDAYS");
    const holidays = await loadHolidays(2025);
    Logger.info(`Holidays Map Keys: ${Object.keys(holidays).length}`, "CHECK_HOLIDAYS");
    if (holidays['2025-12-25']) {
      Logger.info("Success: Christmas 2025 found in map!", "CHECK_HOLIDAYS");
    } else {
      Logger.error("Failed: Christmas 2025 NOT found", null, "CHECK_HOLIDAYS");
    }
    process.exit(0);
  } catch (error) {
    Logger.error("Error checking holidays", error, "CHECK_HOLIDAYS");
    process.exit(1);
  }
})();
