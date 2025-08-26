// backend/routes/calendar.js
const express = require("express");
const { google } = require("googleapis");

const router = express.Router();

const dayIndex = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
const BYDAY = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA", 0: "SU" };

function nextMonday(from = new Date()) {
  const d = new Date(from);
  const add = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getOAuth2Client(req) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  const oAuth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  const refreshToken = req.user?.google?.refreshToken;
  if (refreshToken) oAuth2.setCredentials({ refresh_token: refreshToken });
  return oAuth2;
}

router.post("/export", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: "Not signed in" });
    }

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

    const { name = "SchedulEase Plan", blocks = [] } = req.body;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ ok: false, error: "No blocks provided" });
    }

    const auth = getOAuth2Client(req);
    const calendar = google.calendar({ version: "v3", auth });

    const base = nextMonday();
    let created = 0;
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";

    for (const b of blocks) {
      const idx = dayIndex[b.day];
      if (idx === undefined) continue;

      const evDate = new Date(base);
      evDate.setDate(base.getDate() + (idx - 1));

      const [sh, sm] = String(b.start || "09:00")
        .split(":")
        .map(Number);
      const [eh, em] = String(b.end || "10:00")
        .split(":")
        .map(Number);

      const start = new Date(evDate);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(evDate);
      end.setHours(eh, em, 0, 0);

      const summary = `${b.title || "Class"}${b.crn ? ` (CRN ${b.crn})` : ""}`;

      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary,
          description: `${summary} • Added by SchedulEase`,
          start: { dateTime: start.toISOString(), timeZone },
          end: { dateTime: end.toISOString(), timeZone },
          recurrence: [`RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=${BYDAY[idx]}`],
        },
      });

      created += 1;
    }

    return res.json({ ok: true, created });
  } catch (err) {
    console.error("Calendar export error:", err?.response?.data || err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
