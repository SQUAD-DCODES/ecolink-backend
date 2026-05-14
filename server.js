require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/database");
const { PORT } = require("./src/config");

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log("─────────────────────────────────────────");
    console.log(`  EcoLink Backend`);
    console.log(`  Running on http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
    console.log("─────────────────────────────────────────");
  });

  process.on("SIGTERM", () => server.close(() => process.exit(0)));
  process.on("SIGINT", () => server.close(() => process.exit(0)));
};

start();