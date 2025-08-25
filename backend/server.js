require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// allow the React dev server to call this API
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
// parse JSON bodies up to 64kb
app.use(express.json({ limit: "64kb" }));
// log each request to the console
app.use(morgan("dev"));

// a simple test route to verify wiring
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "api" })); //test route

const coursesRouter = require("./routes/courses"); //import router
const schedulesRouter = require("./routes/schedules"); //import router

app.use("/api/courses", coursesRouter); //use router
app.use("/api/schedules", schedulesRouter); //use router

const PORT = process.env.PORT || 3000; //start server
app.listen(PORT, () =>
  console.log(`API listening on http://localhost:${PORT}`)
);
