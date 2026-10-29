const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  try {
    if (!token) throw new Error("Missing token");
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Please log in" });
  }
};
