const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Enter a name, valid email and password of at least 8 characters" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail)) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)")
    .run(name.trim(), normalizedEmail, await bcrypt.hash(password, 10));
  res.status(201).json({
    message: "Registration successful",
    user: { id: Number(result.lastInsertRowid), name: name.trim(), email: normalizedEmail }
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: Number(user.id) }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.json({ token, user: { id: Number(user.id), name: user.name, email: user.email } });
});

module.exports = router;

