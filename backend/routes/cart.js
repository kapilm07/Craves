const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.get("/", (req, res) => {
  const items = db.prepare(`SELECT ci.id, ci.food_id, f.name, f.price, ci.quantity,
    f.price * ci.quantity AS subtotal FROM cart_items ci
    JOIN foods f ON f.id = ci.food_id WHERE ci.user_id = ? AND f.available = 1`)
    .all(req.user.id);
  res.json({ items, total: items.reduce((sum, item) => sum + item.subtotal, 0) });
});

router.post("/items", (req, res) => {
  const foodId = Number(req.body.food_id);
  const quantity = req.body.quantity === undefined ? 1 : req.body.quantity;
  if (!Number.isInteger(foodId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ message: "Valid food_id and quantity (1-99) are required" });
  }
  if (!db.prepare("SELECT id FROM foods WHERE id = ? AND available = 1").get(foodId)) {
    return res.status(404).json({ message: "Food not found" });
  }
  const current = db.prepare("SELECT quantity FROM cart_items WHERE user_id = ? AND food_id = ?")
    .get(req.user.id, foodId);
  if (current && current.quantity + quantity > 99) {
    return res.status(400).json({ message: "Maximum quantity is 99" });
  }
  db.prepare(`INSERT INTO cart_items (user_id, food_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(user_id, food_id) DO UPDATE SET quantity = quantity + excluded.quantity`)
    .run(req.user.id, foodId, quantity);
  res.json({ message: "Cart updated" });
});

router.patch("/items/:id", (req, res) => {
  const { quantity } = req.body;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ message: "Quantity must be between 1 and 99" });
  }
  const result = db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?")
    .run(quantity, req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ message: "Cart item not found" });
  res.json({ message: "Cart updated" });
});

router.delete("/items/:id", (req, res) => {
  const result = db.prepare("DELETE FROM cart_items WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ message: "Cart item not found" });
  res.json({ message: "Item removed" });
});

module.exports = router;
