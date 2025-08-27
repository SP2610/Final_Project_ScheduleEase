// backend/routes/calendar.js
const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

/* ---------------- utilities ---------------- */

const dayIndex = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
const BYDAY = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA", 0: "SU" };

// next Monday (starting at 00:00)
function nextMonday(from = new Date()) {
  const d = new Date(from);
  const add = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(0, 0, 0, 0);
  return d;
}

// parse "12:30 PM" → {h:12, m:30}  (24h)
function parse12h(t) {
  if (!t || /TBA/i.test(t)) return null;
  const m = String(t)
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return { h, m: min };
}

// Build an OAuth2 client using refresh token stored on session
function getOAuth2Client(req) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  const oAuth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  const refreshToken = req.user?.google?.refreshToken;
  if (refreshToken) oAuth2.setCredentials({ refresh_token: refreshToken });
  return oAuth2;
}

/* ---------------- route ---------------- */

/**
 * POST /api/calendar/export
 * Body: { name: string, blocks: [{ day:'Mon', start:'12:30 PM', end:'1:50 PM', title, crn }] }
 */
router.post("/export", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "Not signed in" });
    }

    // ask user to re-consent if we lack a refresh token
    if (!req.user.google?.refreshToken) {
      const authUrl =
        "/api/auth/google?access_type=offline&prompt=consent&scope=" +
        encodeURIComponent(
          [
            "openid",
            "profile",
            "email",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" ")
        );
      return res
        .status(428)
        .json({ ok: false, requireReconsent: true, authUrl });
    }

    const { name = "SchedulEase Plan", blocks = [] } = req.body || {};
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ ok: false, error: "No blocks provided" });
    }

    const auth = getOAuth2Client(req);
    const calendar = google.calendar({ version: "v3", auth });

    // Choose a timezone (you can swap to user's tz if you store it)
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";

    const base = nextMonday();
    let created = 0;
    let skipped = 0;

    for (const b of blocks) {
      const idx = dayIndex[b.day];
      if (idx === undefined) {
        skipped++;
        continue;
      }

      // parse "12:30 PM" etc.
      const startParts = parse12h(b.start);
      const endParts = parse12h(b.end);
      if (!startParts || !endParts) {
        skipped++;
        continue;
      }

      const evDate = new Date(base);
      evDate.setDate(base.getDate() + (idx - 1)); // to target weekday

      const start = new Date(evDate);
      start.setHours(startParts.h, startParts.m, 0, 0);

      const end = new Date(evDate);
      end.setHours(endParts.h, endParts.m, 0, 0);

      // guard against invalid dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        skipped++;
        continue;
      }

      const summary = `${b.title || "Class"}${b.crn ? ` (CRN ${b.crn})` : ""}`;

      const requestBody = {
        summary,
        description: `${summary} • Added by SchedulEase`,
        start: { dateTime: start.toISOString(), timeZone },
        end: { dateTime: end.toISOString(), timeZone },
        recurrence: [`RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=${BYDAY[idx]}`],
      };

      await calendar.events.insert({
        calendarId: "primary",
        requestBody,
      });

      created++;
    }

    return res.json({ ok: true, created, skipped, timeZone });
  } catch (err) {
    console.error("Calendar export error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || String(err) });
  }
});

module.exports = router;
