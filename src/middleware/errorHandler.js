const { error } = require("../utils/helpers");

/**
 * Catches any unhandled errors thrown inside route handlers.
 * Must be the LAST middleware registered in app.js.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);

  // Axios errors from Squad API
  if (err.response) {
    const { status, data } = err.response;
    return error(
      res,
      data?.message || "Squad API error",
      status,
      data
    );
  }

  // Validation errors (express-validator)
  if (err.type === "validation") {
    return error(res, "Validation failed", 400, err.errors);
  }

  return error(res, err.message || "Internal server error", err.status || 500);
};

/**
 * 404 handler — catches requests to undefined routes.
 */
const notFound = (req, res) => {
  return error(res, `Route ${req.method} ${req.path} not found`, 404);
};

module.exports = { errorHandler, notFound };
