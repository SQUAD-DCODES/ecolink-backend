require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  SQUAD: {
    SECRET_KEY: process.env.SQUAD_SECRET_KEY,
    BASE_URL: process.env.SQUAD_BASE_URL || "https://api-d.squadco.com",
    MERCHANT_ID: process.env.SQUAD_MERCHANT_ID,
  },

  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || "ecolink_dev_secret",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};