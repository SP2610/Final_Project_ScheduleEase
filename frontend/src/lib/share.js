// frontend/src/lib/share.js

// Opens the browser's print dialog. Pair with print CSS for nice PDFs.
export function printSchedule() {
  window.print();
}

function nextMonday(d = new Date()) {
  const date = new Date(d);
  const add = (8 - date.getDay()) % 7 || 7; // next Monday
  date.setDate(date.getDate() + add);
  date.setHours(0, 0, 0, 0);
  return date;
}
function toIcsDate(dt) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(
    dt.getDate()
  )}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}
const dayIndex = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
const BYDAY = { 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA", 0: "SU" };

// Download an .ics calendar with recurring weekly events for the schedule
export function exportICS(schedule, name = "SchedulEase Plan") {
  const base = nextMonday();
  const events = [];

  (schedule?.blocks || []).forEach((b) => {
    const idx = dayIndex[b.day] ?? 1;
    const evDate = new Date(base);
    evDate.setDate(base.getDate() + (idx - 1));

    const [sh, sm] = (b.start || "09:00").split(":").map(Number);
    const [eh, em] = (b.end || "10:00").split(":").map(Number);

    const start = new Date(evDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(evDate);
    end.setHours(eh, em, 0, 0);

    const uid = `${b.crn || "x"}-${toIcsDate(start)}@scheduleease`;

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${toIcsDate(new Date())}Z`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=${BYDAY[idx]}`, // 10 weeks demo
        `SUMMARY:${b.title || "Class"} (${b.crn || ""})`,
        "END:VEVENT",
      ].join("\r\n")
    );
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SchedulEase//EN",
    `X-WR-CALNAME:${name}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "schedule.ics",
  });
  a.click();
  URL.revokeObjectURL(url);
}

// Copy a readable text summary of the schedule to the clipboard
export function shareText(schedule) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const byDay = Object.fromEntries(days.map((d) => [d, []]));
  (schedule?.blocks || []).forEach((b) => (byDay[b.day] ??= []).push(b));

  const lines = ["SchedulEase plan"];
  if (schedule?.stats) {
    lines.push(
      `Earliest ${schedule.stats.earliest}, Latest ${schedule.stats.latest}, Gaps ${schedule.stats.gaps}m`
    );
  }
  days.forEach((d) => {
    lines.push(`\n${d}`);
    (byDay[d] || [])
      .sort((a, b) => a.start.localeCompare(b.start))
      .forEach((b) => {
        lines.push(`  ${b.start}-${b.end}  ${b.title}  CRN ${b.crn}`);
      });
    if (!byDay[d]?.length) lines.push("  —");
  });

  navigator.clipboard.writeText(lines.join("\n"));
  alert("Text summary copied!");
}

export function exportJSON(data, name = "plan") {
  const safe = (name || "plan").replace(/\s+/g, "_");
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${safe}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
}
