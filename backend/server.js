
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { MongoClient } = require("mongodb");


const session = require("express-session");
const passport = require("passport");

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true, 
  })
);
app.use(express.json({ limit: "64kb" }));
app.use(morgan("dev"));


app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, 
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());


app.use("/api/auth", require("./auth/google"));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "api" }));


const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "scheduleEase";

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in backend/.env");
  process.exit(1);
}

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

async function startMongo() {
  await client.connect();
  const db = client.db(DB_NAME);

  app.locals.db = db;
  app.locals.collections = {
    courses: db.collection("courses"),
    sections: db.collection("sections"),
    plans: db.collection("plans"),
    professors: db.collection("professors"),
    reviews: db.collection("reviews"),
  };

  try {
    await app.locals.collections.reviews.createIndex({
      professorNorm: 1,
      createdAt: -1,
    });
    await app.locals.collections.reviews.createIndex({
      professorNormNoComma: 1,
      createdAt: -1,
    });
    await app.locals.collections.reviews.createIndex({
      userId: 1,
      createdAt: -1,
    });
  } catch (e) {
    console.warn("Reviews index creation warning:", e?.message);
  }

  console.log(`MongoDB connected • DB: ${DB_NAME}`);
}
startMongo().catch((err) => {
  console.error(" MongoDB connection failed:", err.message);
  process.exit(1);
});

app.get("/api/db/health", async (_req, res) => {
  try {
    await app.locals.db.command({ ping: 1 });
    res.json({ ok: true, db: DB_NAME });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use((req, _res, next) => {
  req.db = app.locals.db;
  req.collections = app.locals.collections;
  next();
});

app.use("/api/reviews", require("./routes/reviews")); 
app.use("/api/courses", require("./routes/courses"));
app.use("/api/schedules", require("./routes/schedules"));
app.use("/api/calendar", require("./routes/calendar")); 

app.get("/api/me", (req, res) => {
  if (req.user) return res.json({ user: req.user });
  res.status(401).json({ error: "not signed in" });
});

app.post("/api/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
  console.log(` API listening on http://localhost:${PORT}`)
);

["SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, async () => {
    console.log(`\n ${sig} received, closing...`);
    try {
      await client.close();
    } catch {}
    server.close(() => process.exit(0));
  })
);
