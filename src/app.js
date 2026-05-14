const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { FRONTEND_URL, NODE_ENV } = require("./config");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/auth.routes");
const walletRoutes = require("./routes/wallet.routes");
const jobsRoutes = require("./routes/jobs.routes");
const savingsRoutes = require("./routes/savings.routes");
const creditRoutes = require("./routes/credit.routes");
const profileRoutes = require("./routes/profile.routes");
const vouchRoutes = require("./routes/vouch.routes");
const webhooksRoutes = require("./routes/webhooks.routes");

const app = express();

app.use(helmet());

app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// Webhook route needs raw body for signature validation
app.use("/api/webhooks", express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "EcoLink API",
    status: "online",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/savings", savingsRoutes);
app.use("/api/credit", creditRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vouch", vouchRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;