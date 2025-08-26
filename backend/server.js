// backend/server.js
require("dotenv").config(); // reads backend/.env
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { MongoClient } = require("mongodb");

const app = express();

/* ---------- Core middleware ---------- */
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "64kb" }));
app.use(morgan("dev"));

/* ---------- Health (API) ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "api" }));

/* ---------- MongoDB wiring ---------- */
const MONGO_URI = process.env.MONGO_URI; // required
const DB_NAME = process.env.DB_NAME || "scheduleease"; // optional default

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in backend/.env");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

async function startMongo() {
  await client.connect();
  const db = client.db(DB_NAME);

  // make db & commonly used collections available everywhere
  app.locals.db = db;
  app.locals.collections = {
    courses: db.collection("courses"),
    sections: db.collection("sections"),
    plans: db.collection("plans"),
    professors: db.collection("professors"),
  };

  console.log(`✅ MongoDB connected • DB: ${DB_NAME}`);
}
startMongo().catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});

// optional: quick DB health check
app.get("/api/db/health", async (req, res) => {
  try {
    await app.locals.db.command({ ping: 1 });
    res.json({ ok: true, db: DB_NAME });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ---------- Your existing routers ---------- */
const coursesRouter = require("./routes/courses");
const schedulesRouter = require("./routes/schedules");

// Example: pass db to routers if/when you migrate them to Mongo later
app.use((req, _res, next) => {
  req.db = app.locals.db;
  req.collections = app.locals.collections;
  next();
});

app.use("/api/courses", coursesRouter);
app.use("/api/schedules", schedulesRouter);

/* ---------- Start server & graceful shutdown ---------- */
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(`🚀 API listening on http://localhost:${PORT}`)
);

// close Mongo nicely on exit
["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, async () => {
    console.log(`\n🛑 ${sig} received, closing...`);
    try {
      await client.close();
    } catch {}
    server.close(() => process.exit(0));
  })
);
