const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

router.post("/", (req, res) => {
  const address = req.body.address;
  if (typeof address !== "string" || !address.trim() || address.trim().length > 500) {
    return res.status(400).json({ message: "A valid delivery address is required" });
  }
  const items = db.prepare(`SELECT f.name, f.price, ci.quantity FROM cart_items ci
    JOIN foods f ON f.id = ci.food_id WHERE ci.user_id = ? AND f.available = 1`)
    .all(req.user.id);
  if (!items.length) return res.status(400).json({ message: "Your cart is empty" });

  const total = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
  db.exec("BEGIN");
  try {
    const result = db.prepare("INSERT INTO orders (user_id, total, address) VALUES (?, ?, ?)")
      .run(req.user.id, total, address.trim());
    const orderId = Number(result.lastInsertRowid);
    const addItem = db.prepare(
      "INSERT INTO order_items (order_id, food_name, price, quantity) VALUES (?, ?, ?, ?)"
    );
    items.forEach(item => addItem.run(orderId, item.name, item.price, item.quantity));
    db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(req.user.id);
    db.exec("COMMIT");
    res.status(201).json({ id: orderId, total, address: address.trim(), status: "pending", items });
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
});

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC").all(req.user.id));
});

router.get("/:id", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ message: "Order not found" });
  order.items = db.prepare("SELECT food_name, price, quantity FROM order_items WHERE order_id = ?")
    .all(order.id);
  res.json(order);
});

module.exports = router;
