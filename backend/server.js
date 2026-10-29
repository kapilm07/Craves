require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./config/database");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Set JWT_SECRET to at least 32 characters in .env");
}

const app = express();
const port = Number(process.env.PORT || 5000);

app.disable("x-powered-by");
app.use(cors({
  origin: (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(x => x.trim())
}));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ status: "OK work aguthu" }));// tested
app.use("/api/auth", require("./routes/auth"));// tested
app.use("/api/categories", require("./routes/categories"));//tested
app.use("/api/foods", require("./routes/foods"));// tested
app.use("/api/cart", require("./routes/cart"));//test
app.use("/api/orders", require("./routes/orders"));//tested 

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

const server = app.listen(port, () => {
  console.log(`FoodOrder API running at http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => {
    db.close();
    process.exit(0);
  }));
}
