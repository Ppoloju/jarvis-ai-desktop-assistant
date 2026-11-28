import "dotenv/config";
import app from "./app.js";
import { startReminderScheduler } from "./services/reminders/scheduler.js";

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "127.0.0.1";

const server = app.listen(PORT, HOST, () => {
  console.log(`Orbit API running on http://${HOST}:${PORT}`);
  startReminderScheduler();
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or start with a different PORT.`
    );
    process.exit(1);
  }

  console.error("The API could not start:", error.message);
  process.exit(1);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down.`);

  server.close(() => process.exit(0));

  // Do not wait forever for keep-alive connections to end
  setTimeout(() => process.exit(0), 5000).unref();
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}
