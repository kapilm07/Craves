const express = require("express");
const db = require("../config/database");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
});

module.exports = router;
