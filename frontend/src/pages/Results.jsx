import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  downloadPlanJSON,
  exportICS,
  openGmailCompose,
  printSchedule,
  scheduleToText,
} from "../lib/share";
import ResultsTimetable from "./ResultsTimeTable";

export default function Results() {
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStats, setGenerationStats] = useState(null);
  const [menuOpen, setMenuOpen] = useState(-1); // which schedule’s share menu is open

  const [prefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("prefs") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    generateSchedules();
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      const openMenu = document.querySelector(".share-menu");
      const clickedToggle = e.target.closest("[data-share-toggle]");
      const insideMenu = e.target.closest(".share-menu");
      if (openMenu && !clickedToggle && !insideMenu) {
        setMenuOpen(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const generateSchedules = async () => {
    const selectedCourses = JSON.parse(
      sessionStorage.getItem("selectedCourses") || "[]"
    );

    if (!selectedCourses.length) {
      setSchedules([]);
      setError("No courses selected");
      return;
    }

    setIsGenerating(true);
    setSchedules(null);
    setError("");
    setGenerationStats(null);

    try {
      const response = await api.post("/courses/generate-schedules", {
        courses: selectedCourses,
        prefs,
      });

      if (response.data.schedules) {
        setSchedules(response.data.schedules);
        setGenerationStats({
          total_combinations: response.data.total_combinations || 0,
          valid_count: response.data.count || 0,
          conflicting_count: response.data.conflicting_combinations || 0,
        });
      } else {
        setSchedules([]);
        setError("No schedules generated");
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to generate schedules";
      const errorDetails = err?.response?.data?.details;

      setError(
        errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage
      );
      setSchedules([]);

      if (err?.response?.data?.failed_courses) {
        const failedCourses = err.response.data.failed_courses;
        const failedList = failedCourses
          .map((fc) => `${fc.course}: ${fc.error}`)
          .join("; ");
        setError(`${errorMessage}. Failed courses: ${failedList}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  async function exportToGoogle(plan, name) {
    try {
      const { data } = await api.post("/calendar/export", {
        name,
        blocks: plan.blocks || [],
      });
      if (data.ok) {
        alert(
          `Added ${data.created} class${
            data.created === 1 ? "" : "es"
          } to your Google Calendar.`
        );
      } else {
        throw new Error(data.error || "Export failed");
      }
    } catch (e) {
      const needConsent =
        e?.response?.status === 428 && e?.response?.data?.authUrl;
      if (needConsent) {
        window.location.href = `http://localhost:3000${e.response.data.authUrl}`;
        return;
      }
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "Network error while adding to Google Calendar";
      alert(msg);
    }
  }

  function handleDownloadJSON(sch, idx) {
    downloadPlanJSON(sch, `Schedule_${idx + 1}`);
  }

  function handleShareGmail(sch, idx) {
    const subject = `SchedulEase — Schedule ${idx + 1}`;
    const body = scheduleToText(sch, subject);
    openGmailCompose({ to: "", subject, body });
  }

  if (isGenerating) {
    return (
      <div className="stack">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h2 className="h2">Generating Schedules...</h2>
          <p className="muted">
            Analyzing course sections and finding valid combinations...
            <br />
            This may take a few moments.
          </p>
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid rgba(155, 140, 255, 0.3)",
              borderTop: "3px solid var(--primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "20px auto",
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stack">
        <div
          style={{
            padding: "20px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "12px",
            color: "#dc2626",
          }}
        >
          <h3 style={{ margin: "0 0 10px", color: "#dc2626" }}>
            Schedule Generation Failed
          </h3>
          <p style={{ margin: 0 }}>{error}</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "10px" }}
            onClick={generateSchedules}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (schedules === null) return <p className="muted">Loading...</p>;

  if (!schedules.length) {
    return (
      <div className="stack">
        <div
          style={{
            padding: "20px",
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <h3 style={{ margin: "0 0 10px", color: "#d97706" }}>
            No Valid Schedules Found
          </h3>
          <p
            className="muted"
            style={{ margin: "0 0 15px" }}
          >
            No schedule combinations were possible with your selected courses
            and preferences. Try removing a course or relaxing your preferences.
          </p>
          {generationStats && (
            <p
              className="muted"
              style={{ fontSize: "14px", margin: "0 0 15px" }}
            >
              Analyzed {generationStats.total_combinations} possible
              combinations, found {generationStats.conflicting_count} conflicts.
            </p>
          )}
          <button
            className="btn btn-primary"
            onClick={() => window.history.back()}
          >
            Back to Course Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 className="h2">
          Schedule Results <span className="muted">({schedules.length})</span>
        </h2>
        {generationStats && (
          <div
            className="stat"
            style={{ fontSize: "14px" }}
          >
            {generationStats.valid_count} valid of{" "}
            {generationStats.total_combinations} total combinations
            {generationStats.conflicting_count > 0 && (
              <> • {generationStats.conflicting_count} conflicting</>
            )}
          </div>
        )}
      </div>

      <div className="stack">
        {schedules.map((sch, idx) => (
          <section
            key={idx}
            className="card result-card"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>Schedule Option {idx + 1}</h3>
              {"stats" in sch && (
                <div className="stat">
                  {sch.stats.earliest} - {sch.stats.latest}
                  {sch.stats.days > 0 && <> • {sch.stats.days} days</>}
                  {sch.stats.gaps > 0 && <> • {sch.stats.gaps}m gaps</>}
                </div>
              )}
            </div>

            <div style={{ margin: "12px 0" }}>
              <ResultsTimetable blocks={sch.blocks || []} />
            </div>

            <div style={{ margin: "12px 0", fontSize: "14px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                Course Details:
              </h4>
              {sch.blocks && sch.blocks.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    background: "rgba(255, 255, 255, 0.02)",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {Object.entries(
                    sch.blocks.flat().reduce((acc, block) => {
                      const courseMatch =
                        block.title.match(/^([A-Z]+\d+[A-Z]*)/);
                      const course = courseMatch ? courseMatch[1] : "Unknown";
                      if (!acc[course]) acc[course] = [];
                      acc[course].push(block);
                      return acc;
                    }, {})
                  ).map(([course, blocks]) => (
                    <div
                      key={course}
                      style={{ marginBottom: "8px" }}
                    >
                      <strong style={{ color: "var(--primary)" }}>
                        {course}:
                      </strong>
                      <div
                        style={{ marginLeft: "12px", color: "var(--muted)" }}
                      >
                        {blocks.map((block, i) => (
                          <div key={i}>
                            CRN {block.crn} •{" "}
                            {block.title.replace(course, "").trim()} •{" "}
                            {block.location || "TBA"}
                            {block.instructor && block.instructor !== "TBA" && (
                              <> • {block.instructor}</>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                position: "relative",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() => {
                  const plans = JSON.parse(
                    localStorage.getItem("plans") || "[]"
                  );
                  const toSave = {
                    id: Date.now(),
                    name: `Schedule ${idx + 1}`,
                    ...sch,
                    savedAt: new Date().toISOString(),
                  };
                  localStorage.setItem(
                    "plans",
                    JSON.stringify([toSave, ...plans])
                  );
                  alert("Schedule saved! Check the Plans page to view it.");
                }}
              >
                Save Schedule
              </button>

              <button
                className="btn"
                onClick={() => {
                  const crnList = (sch.crns || []).join(", ");
                  navigator.clipboard.writeText(crnList);
                  alert("CRNs copied to clipboard");
                }}
              >
                Copy CRNs
              </button>

              <button
                className="btn"
                onClick={() => printSchedule()}
              >
                Print / Save PDF
              </button>

              <button
                className="btn"
                onClick={() => exportICS(sch, `Schedule ${idx + 1}`)}
              >
                Export .ICS
              </button>

              <button
                className="btn"
                onClick={() =>
                  exportToGoogle(sch, `SchedulEase — Schedule ${idx + 1}`)
                }
              >
                Add to Google Calendar
              </button>
              <div style={{ position: "relative" }}>
                <button
                  className="btn"
                  data-share-toggle
                  onClick={() => setMenuOpen(menuOpen === idx ? -1 : idx)}
                >
                  Share ▾
                </button>
                {menuOpen === idx && (
                  <div
                    className="share-menu"
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      minWidth: 220,
                      background: "var(--panel)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      boxShadow: "var(--shadow)",
                      padding: 6,
                      zIndex: 5,
                    }}
                  >
                    <button
                      className="menu-item"
                      onClick={() => {
                        downloadPlanJSON(sch, `Schedule_${idx + 1}`);
                        setMenuOpen(-1);
                      }}
                    >
                      Download JSON
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => {
                        const subject = `SchedulEase — Schedule ${idx + 1}`;
                        const body = scheduleToText(sch, subject);
                        openGmailCompose({ to: "", subject, body });
                        setMenuOpen(-1);
                      }}
                    >
                      Share via Gmail
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
