const mongoose = require("mongoose");
const { MONGODB_URI } = require("./index");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: "ecolink",
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error("[MongoDB] Connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[MongoDB] Disconnected");
    });

  } catch (err) {
    console.error("[MongoDB] Connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;