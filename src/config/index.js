require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  SQUAD: {
    SECRET_KEY: process.env.SQUAD_SECRET_KEY,
    BASE_URL: process.env.SQUAD_BASE_URL || "https://sandbox-api-d.squadco.com",
    MERCHANT_ID: process.env.SQUAD_MERCHANT_ID,
  },

  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || "ecolink_dev_secret",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  GROK_API_KEY: process.env.GROK_API_KEY,
  GROK_API_URL: process.env.GROK_API_URL || "https://api.x.ai/v1/chat/completions",
  GROK_MODEL: process.env.GROK_MODEL || "grok-2-latest",
};