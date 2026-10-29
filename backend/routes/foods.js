const express = require("express");
const db = require("../config/database");

const router = express.Router();

router.get("/", (req, res) => {
  const search = String(req.query.search || "").trim();
  const categoryId = req.query.categoryId;
  let sql = `SELECT f.*, c.name AS category_name FROM foods f
    LEFT JOIN categories c ON c.id = f.category_id WHERE f.available = 1`;
  const values = [];
  if (search) {
    sql += " AND (f.name LIKE ? OR f.description LIKE ?)";
    values.push(`%${search}%`, `%${search}%`);
  }
  if (categoryId !== undefined) {
    if (!/^\d+$/.test(String(categoryId))) {
      return res.status(400).json({ message: "Invalid categoryId" });
    }
    sql += " AND f.category_id = ?";
    values.push(Number(categoryId));
  }
  res.json(db.prepare(`${sql} ORDER BY f.name`).all(...values));
});


//by id
router.get("/:id", (req, res) => {
  const food = db.prepare(`SELECT f.*, c.name AS category_name FROM foods f
    LEFT JOIN categories c ON c.id = f.category_id
    WHERE f.id = ? AND f.available = 1`).get(req.params.id);
  if (!food) return res.status(404).json({ message: "Food not found" });
  res.json(food);
});

module.exports = router;
