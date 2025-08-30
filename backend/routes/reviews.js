const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

function canonicalProfessor(input = "") {
  let s = String(input).trim();
  if (!s) return "";
  if (s.includes(",")) {
    s = s.replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ");
    return s.toLowerCase();
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].toLowerCase();
  const last = parts[0];
  const firstRest = parts.slice(1).join(" ");
  return `${last}, ${firstRest}`.toLowerCase();
}
function altNoCommaProfessor(input = "") {
  let s = String(input).trim();
  if (!s) return "";
  s = s.replace(/\s*,\s*/g, " ").replace(/\s+/g, " ");
  return s.toLowerCase();
}

function formatProfessorName(last, first) {
  last = String(last || "").trim();
  first = String(first || "").trim();
  if (last && first) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return "";
}

function splitDisplayToNames(display = "") {
  const s = String(display).trim();
  if (!s) return { last: "", first: "" };
  if (s.includes(",")) {
    const [l, ...rest] = s.split(",");
    return { last: l.trim(), first: rest.join(",").trim() };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { last: parts[0], first: "" };
  return { last: parts[0], first: parts.slice(1).join(" ") };
}

function getProfessorFromBody(body = {}) {
  const last = String(body.professorLast || "").trim();
  const first = String(body.professorFirst || "").trim();

  if (last || first) {
    const display = formatProfessorName(last, first);
    return {
      display,
      last,
      first,
      normCanon: canonicalProfessor(display),
      normNoComma: altNoCommaProfessor(display),
    };
  }

  const p = String(body.professor || "").trim();
  if (p) {
    const display = p.includes(",") ? p.replace(/\s*,\s*/g, ", ") : p;
    const { last: l2, first: f2 } = splitDisplayToNames(display);
    return {
      display,
      last: l2,
      first: f2,
      normCanon: canonicalProfessor(display),
      normNoComma: altNoCommaProfessor(display),
    };
  }

  return { display: "", last: "", first: "", normCanon: "", normNoComma: "" };
}

router.post("/", async (req, res) => {
  try {
    const db = req.db || req.app.locals.db;
    const Reviews = req.collections?.reviews || db.collection("reviews");

    if (!req.user) {
      return res.status(401).json({ ok: false, error: "Sign in required" });
    }

    const {
      display: professor,
      last: professorLast,
      first: professorFirst,
      normCanon,
      normNoComma,
    } = getProfessorFromBody(req.body);

    if (!professor) {
      return res
        .status(400)
        .json({ ok: false, error: "Professor name required (Last, First)" });
    }

    const r = Number(req.body.rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ ok: false, error: "Rating must be 1–5" });
    }

    const description = String(
      req.body.description ?? req.body.text ?? ""
    ).trim();
    if (!description) {
      return res.status(400).json({ ok: false, error: "Review text required" });
    }

    const courseCode =
      String(req.body.courseCode || "")
        .trim()
        .toUpperCase() || null;

    const doc = {
      professor, 
      professorLast,
      professorFirst,
      professorNorm: normCanon,
      professorNormNoComma: normNoComma,


      rating: Math.round(r),
      description,
      courseCode,


      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      createdAt: new Date(),
    };

    const result = await Reviews.insertOne(doc);
    return res.json({ ok: true, id: result.insertedId });
  } catch (err) {
    console.error("POST /api/reviews error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const db = req.db || req.app.locals.db;
    const Reviews = req.collections?.reviews || db.collection("reviews");

    const qRaw = String(req.query.professor || "").trim();
    if (!qRaw) {
      return res
        .status(400)
        .json({ ok: false, error: "Query ?professor=Last, First is required" });
    }

    const normCanon = canonicalProfessor(qRaw);
    const normNoComma = altNoCommaProfessor(qRaw);

    const items = await Reviews.find({
      $or: [
        { professorNorm: normCanon },
        { professorNormNoComma: normNoComma },
        { professorNorm: normNoComma }, 
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return res.json({ ok: true, count: items.length, reviews: items });
  } catch (err) {
    console.error("GET /api/reviews error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const db = req.db || req.app.locals.db;
    const Reviews = req.collections?.reviews || db.collection("reviews");

    const qRaw = String(req.query.q || "").trim();
    if (!qRaw) {
      return res.status(400).json({ ok: false, error: "Query ?q= required" });
    }

    const normCanon = canonicalProfessor(qRaw);
    const normNoComma = altNoCommaProfessor(qRaw);

    const items = await Reviews.find({
      $or: [
        { professorNorm: { $regex: `^${escapeRegex(normCanon)}` } },
        { professorNormNoComma: { $regex: `^${escapeRegex(normNoComma)}` } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return res.json({ ok: true, count: items.length, reviews: items });
  } catch (err) {
    console.error("GET /api/reviews/search error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const db = req.db || req.app.locals.db;
    const Reviews = req.collections?.reviews || db.collection("reviews");

    const id = req.params.id;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ ok: false, error: "Bad id" });

    const item = await Reviews.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).json({ ok: false, error: "Not found" });

    return res.json({ ok: true, review: item });
  } catch (err) {
    console.error("GET /api/reviews/:id error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

function escapeRegex(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = router;
