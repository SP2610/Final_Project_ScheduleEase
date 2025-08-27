// backend/routes/schedules.js
const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");

/* ---------------------------------------
   Python exec selection
---------------------------------------- */
function getPythonExec() {
  // Prefer explicit env var from backend/.env
  if (process.env.PYTHON_PATH && process.env.PYTHON_PATH.trim()) {
    return process.env.PYTHON_PATH.trim();
  }
  // Fallbacks by OS
  return process.platform === "win32" ? "python" : "python3";
}

const SCRAPER_PATH = path.resolve(__dirname, "../../scripts/course_scraper.py");

/* ---------------------------------------
   Helpers to map/format schedule data
---------------------------------------- */
function createScheduleBlocks(section, courseCode, type) {
  // section.schedule example: "MWF 10:00 AM - 10:50 AM" or "TBA"
  const blocks = [];
  const schedule = section?.schedule || "TBA";
  const parts = schedule.split(" ");
  const days = parts[0] || "TBA";
  const timeRange = parts.slice(1).join(" ") || "TBA";

  const [startTime, endTime] = timeRange.includes(" - ")
    ? timeRange.split(" - ")
    : [timeRange, timeRange];

  if (days !== "TBA") {
    const map = {
      M: "Mon",
      T: "Tue",
      W: "Wed",
      R: "Thu",
      F: "Fri",
      S: "Sat",
      U: "Sun",
    };
    for (const ch of days) {
      if (map[ch]) {
        blocks.push({
          day: map[ch],
          start: (startTime || "TBA").trim(),
          end: (endTime || "TBA").trim(),
          title: `${courseCode} ${type}`.trim(),
          crn: section.crn,
          location: section.location || "TBA",
          instructor: Array.isArray(section.instructors)
            ? section.instructors.join(", ")
            : section.instructors || "TBA",
        });
      }
    }
  }
  return blocks;
}

function timeToMinutes(timeStr) {
  if (!timeStr || timeStr === "TBA") return -1;
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return -1;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function minutesToTime(mins) {
  if (mins === -1) return "TBA";
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function calculateScheduleStats(blocks) {
  const flat = blocks.flat();
  if (!flat.length) return { earliest: "TBA", latest: "TBA", gaps: 0, days: 0 };

  const times = flat
    .filter((b) => b.start !== "TBA" && b.end !== "TBA")
    .map((b) => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) }))
    .filter((t) => t.start !== -1 && t.end !== -1);

  if (!times.length)
    return { earliest: "TBA", latest: "TBA", gaps: 0, days: 0 };

  const earliest = Math.min(...times.map((t) => t.start));
  const latest = Math.max(...times.map((t) => t.end));
  const uniqueDays = new Set(flat.map((b) => b.day)).size;

  // daily gaps
  let totalGaps = 0;
  const byDay = {};
  flat.forEach((b) => {
    (byDay[b.day] ||= []).push({
      start: timeToMinutes(b.start),
      end: timeToMinutes(b.end),
    });
  });
  Object.values(byDay).forEach((arr) => {
    arr.sort((a, b) => a.start - b.start);
    for (let i = 1; i < arr.length; i++) {
      const gap = arr[i].start - arr[i - 1].end;
      if (gap > 0) totalGaps += gap;
    }
  });

  return {
    earliest: minutesToTime(earliest),
    latest: minutesToTime(latest),
    gaps: totalGaps,
    days: uniqueDays,
  };
}

/* ---------------------------------------
   POST /api/schedules/generate
   Body: { courses: [{subject,code}] | ["CS100", ...], prefs: {...} }
---------------------------------------- */
router.post("/generate", async (req, res) => {
  const { courses = [], prefs = {} } = req.body || {};
  if (!Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: "courses[] required" });
  }

  // Normalize input to "SUBJ123" format the Python script expects
  const courseCodes = courses
    .map((c) => {
      if (typeof c === "string") return c.replace(/\s+/g, "").toUpperCase();
      if (c?.subject && c?.code)
        return `${String(c.subject).toUpperCase()}${String(c.code)}`;
      return null;
    })
    .filter(Boolean);

  try {
    const pythonExec = getPythonExec();
    const args = [SCRAPER_PATH, "generate", ...courseCodes];

    const child = spawn(pythonExec, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env }, // keep your env (e.g., proxies) if needed
    });

    let out = "";
    let err = "";

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));

    // Kill if it hangs > 30s
    const killTimer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {}
    }, 30_000);

    child.on("close", (code) => {
      clearTimeout(killTimer);

      if (code !== 0) {
        console.error(
          "Python exited with code",
          code,
          "\nSTDERR:\n",
          err || "(empty)"
        );
        return res.status(500).json({
          error: "Failed to generate schedules",
          details: err || "Python script execution failed",
        });
      }

      let results;
      try {
        results = JSON.parse(out);
      } catch (e) {
        console.error("Failed to parse Python JSON. Raw stdout:\n", out);
        return res.status(500).json({
          error: "Failed to parse schedule results",
          details: e.message,
        });
      }

      if (!results?.success) {
        return res.status(400).json({
          error: results?.error || "Schedule generation failed",
          failed_courses: results?.failed_courses || [],
        });
      }

      // Map to frontend shape
      const schedules = (results.valid_schedules || []).map((sched) => {
        const blocks = [];
        const crns = [];

        (sched.courses || []).forEach((course) => {
          const code = course.course_code || "";
          if (course.lecture) {
            blocks.push(...createScheduleBlocks(course.lecture, code, "LEC"));
            crns.push(course.lecture.crn);
          }
          if (course.lab) {
            blocks.push(...createScheduleBlocks(course.lab, code, "LAB"));
            crns.push(course.lab.crn);
          }
          if (course.discussion) {
            blocks.push(
              ...createScheduleBlocks(course.discussion, code, "DIS")
            );
            crns.push(course.discussion.crn);
          }
        });

        return {
          crns,
          blocks,
          stats: calculateScheduleStats(blocks),
        };
      });

      return res.json({
        count: schedules.length,
        schedules,
        total_combinations:
          results.total_possible_combinations ?? schedules.length,
        conflicting_combinations: results.conflicting_combinations_count ?? 0,
      });
    });
  } catch (e) {
    console.error("Error spawning Python:", e);
    return res
      .status(500)
      .json({ error: "Failed to generate schedules", details: e.message });
  }
});

module.exports = router;
