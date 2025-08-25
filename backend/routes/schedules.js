const express = require("express");
const router = express.Router();
const sections = require("../data/sections.json");

// POST /api/schedules/generate
// body: { courses:[{subject,code}...], prefs:{ noFriday, startAfter, endBefore } }
router.post("/generate", (req, res) => {
  const { courses = [], prefs = {} } = req.body || {};
  if (!Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: "courses[] required" });
  }

  function toMin(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  const startAfter = prefs.startAfter || "00:00";
  const endBefore = prefs.endBefore || "23:59";
  const noFriday = !!prefs.noFriday;
  const minStart = toMin(startAfter),
    maxEnd = toMin(endBefore);

  function passPrefs(sec) {
    if (noFriday && sec.days.includes("F")) return false;
    if (toMin(sec.start) < minStart) return false;
    if (toMin(sec.end) > maxEnd) return false;
    return true;
  }

  const perCourse = courses.map((c) =>
    sections
      .filter((s) => s.subject === c.subject && s.code === c.code)
      .filter(passPrefs)
  );

  if (perCourse.some((list) => list.length === 0)) {
    return res.json({ count: 0, schedules: [] });
  }

  function conflict(a, b) {
    const overlapDay = [...a.days].some((d) => b.days.includes(d)); // e.g., "MWF"
    if (!overlapDay) return false;
    const a1 = toMin(a.start),
      a2 = toMin(a.end);
    const b1 = toMin(b.start),
      b2 = toMin(b.end);
    return a1 < b2 && b1 < a2;
  }

  const results = [];
  const seen = new Set();

  function fmt(m) {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(
      m % 60
    ).padStart(2, "0")}`;
  }
  function statsOf(pick) {
    const starts = pick.map((x) => toMin(x.start));
    const ends = pick.map((x) => toMin(x.end));
    const earliest = Math.min(...starts);
    const latest = Math.max(...ends);
    // rough gap calc by day:
    let gaps = 0;
    const byDay = {};
    pick.forEach((s) => {
      [...s.days].forEach((d) => (byDay[d] ??= []).push(s));
    });
    Object.values(byDay).forEach((list) => {
      list.sort((a, b) => toMin(a.start) - toMin(b.start));
      for (let i = 1; i < list.length; i++) {
        const prevEnd = toMin(list[i - 1].end);
        const curStart = toMin(list[i].start);
        if (curStart > prevEnd) gaps += curStart - prevEnd;
      }
    });
    const days = new Set(pick.flatMap((s) => [...s.days])).size;
    return { earliest: fmt(earliest), latest: fmt(latest), gaps, days };
  }

  function mapDay(d) {
    return { M: "Mon", T: "Tue", W: "Wed", R: "Thu", F: "Fri" }[d] || d;
  }
  function toBlocks(pick) {
    const out = [];
    pick.forEach((s) => {
      [...s.days].forEach((d) => {
        out.push({
          day: mapDay(d),
          start: s.start,
          end: s.end,
          title: `${s.subject} ${s.code} ${s.type || ""}`.trim(),
          crn: s.crn,
        });
      });
    });
    return out;
  }

  function dfs(i, pick) {
    if (results.length >= 10) return; // cap results to keep fast
    if (i === perCourse.length) {
      const key = pick
        .map((p) => p.crn)
        .sort()
        .join("-");
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          crns: pick.map((p) => p.crn),
          stats: statsOf(pick),
          blocks: toBlocks(pick),
        });
      }
      return;
    }
    for (const sec of perCourse[i]) {
      if (pick.every((p) => !conflict(p, sec))) dfs(i + 1, [...pick, sec]);
    }
  }
  dfs(0, []);

  res.json({ count: results.length, schedules: results });
});

module.exports = router;
