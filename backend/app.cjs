// backend/app.js
// CJS wrapper for Phusion Passenger compatibility.
// Passenger uses require() to load the startup file, which breaks ESM.
// This file bridges CJS -> ESM by using dynamic import().

async function loadApp() {
  await import("./server.js");
}

loadApp().catch(async (err) => {
  try {
    const { default: Logger } = await import("./utils/logger.js");
    Logger.error("Failed to start ESM application", err, "PASSENGER_WRAPPER");
  } catch {
    // eslint-disable-next-line no-console
    console.error("Failed to start ESM application:", err);
  }
  process.exit(1);
});
