// frontend/src/lib/share.js

/* ---------- Print (PDF via browser dialog) ---------- */
export function printSchedule() {
  window.print();
}

/* ---------- ICS export helpers ---------- */
function nextMonday(d = new Date()) {
  const date = new Date(d);
  const add = (8 - date.getDay()) % 7 || 7; // next Monday
  date.setDate(date.getDate() + add);
  date.setHours(0, 0, 0, 0);
  return date;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toIcsDate(dt) {
  // Local time (no Z) so Google/Apple interpret as local with no timezone shift
  return (
    dt.getFullYear() +
    pad2(dt.getMonth() + 1) +
    pad2(dt.getDate()) +
    "T" +
    pad2(dt.getHours()) +
    pad2(dt.getMinutes()) +
    "00"
  );
}
const dayIndex = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
const BYDAY = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA", 0: "SU" };

/**
 * exportICS(schedule, name)
 * schedule.blocks: [{ day:'Mon', start:'10:00 AM', end:'10:50 AM', title, crn }]
 */
export function exportICS(schedule, name = "SchedulEase Plan") {
  const base = nextMonday();
  const events = [];

  (schedule?.blocks || []).forEach((b) => {
    const idx = dayIndex[b.day];
    if (idx == null) return;

    const evDate = new Date(base);
    evDate.setDate(base.getDate() + (idx - 1));

    const [sh, sm] = parseAmPm(b.start || "9:00 AM");
    const [eh, em] = parseAmPm(b.end || "10:00 AM");

    const start = new Date(evDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(evDate);
    end.setHours(eh, em, 0, 0);

    const summary = `${b.title || "Class"}${b.crn ? ` (CRN ${b.crn})` : ""}`;
    const uid = `${b.crn || "x"}-${toIcsDate(start)}@scheduleease`;

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${toIcsDate(new Date())}Z`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=${BYDAY[idx]}`,
        `SUMMARY:${escapeIcs(summary)}`,
        "END:VEVENT",
      ].join("\r\n")
    );
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SchedulEase//EN",
    `X-WR-CALNAME:${escapeIcs(name)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${name.replace(/\s+/g, "_")}.ics`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

function parseAmPm(s) {
  const m = String(s).match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
  if (!m) return [9, 0];
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return [h, min];
}

function escapeIcs(str) {
  return String(str)
    .replace(/([,;])/g, "\\$1")
    .replace(/\n/g, "\\n");
}

/* ---------- Download JSON of a single schedule ---------- */
export function downloadPlanJSON(schedule, baseName = "schedule") {
  const pretty = JSON.stringify(schedule, null, 2);
  const blob = new Blob([pretty], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${baseName}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Build a readable text summary for sharing ---------- */
export function scheduleToText(schedule, title = "SchedulEase Schedule") {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const byDay = Object.fromEntries(days.map((d) => [d, []]));
  (schedule?.blocks || []).forEach((b) => {
    (byDay[b.day] ??= []).push(b);
  });

  const lines = [title];

  if (schedule?.stats) {
    const s = schedule.stats;
    lines.push(
      `Summary: ${s.earliest}–${s.latest}${
        s.days ? ` • ${s.days} day${s.days === 1 ? "" : "s"}` : ""
      }${s.gaps ? ` • ${s.gaps}m gaps` : ""}`
    );
  }

  days.forEach((d) => {
    lines.push(`\n${d}`);
    (byDay[d] || [])
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start))
      .forEach((b) => {
        const crn = b.crn ? ` • CRN ${b.crn}` : "";
        const where =
          b.location && b.location !== "TBA" ? ` • ${b.location}` : "";
        lines.push(`  ${b.start}–${b.end}  ${b.title}${crn}${where}`);
      });
    if (!byDay[d]?.length) lines.push("  —");
  });

  const crns = (schedule?.crns || []).filter(Boolean);
  if (crns.length) {
    lines.push("\nCRNs:", "  " + crns.join(", "));
  }

  return lines.join("\n");
}

/* ---------- Open Gmail compose (web) with prefilled fields) ---------- */
export function openGmailCompose({ to = "", subject = "", body = "" } = {}) {
  const base = "https://mail.google.com/mail/?view=cm&fs=1";
  const params = new URLSearchParams();
  if (to) params.set("to", to);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  const url = `${base}&${params.toString()}`;

  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const mailto = `mailto:${encodeURIComponent(
      to
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }
}
