const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET } = require("../config");
const { error } = require("../utils/helpers");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, "Not authenticated. Please log in.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return error(res, "User no longer exists", 401);

    req.user = user;
    next();
  } catch (err) {
    return error(res, "Invalid or expired token. Please log in again.", 401);
  }
};

module.exports = { protect };