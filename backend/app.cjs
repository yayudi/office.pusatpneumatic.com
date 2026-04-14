// backend/app.js
// CJS wrapper for Phusion Passenger compatibility.
// Passenger uses require() to load the startup file, which breaks ESM.
// This file bridges CJS -> ESM by using dynamic import().

async function loadApp() {
  await import("./server.js");
}

loadApp().catch((err) => {
  console.error("Failed to start ESM application:", err);
  process.exit(1);
});
