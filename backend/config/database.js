const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(process.env.DB_FILE || "./foodorder.db");

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    price REAL NOT NULL CHECK (price > 0),
    image_url TEXT,
    available INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
    UNIQUE(user_id, food_id)
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total REAL NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
  );
`);

const addCategory = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
["Pizza", "Burgers", "Indian", "Drinks", "Desserts"].forEach(name => addCategory.run(name));

const addFood = db.prepare(
  "INSERT OR IGNORE INTO foods (category_id, name, description, price) VALUES (?, ?, ?, ?)"
);
[
  [1, "Margherita Pizza", "Classic cheese pizza", 249],
  [2, "Veg Burger", "Vegetable patty burger", 129],
  [3, "Paneer Biryani", "Aromatic paneer biryani", 199],
  [4, "Cold Coffee", "Chilled coffee", 99],
  [5, "Chocolate Brownie", "Warm chocolate brownie", 89]
].forEach(food => addFood.run(...food));

console.log("SQLite database connected successfully");

module.exports = db;
