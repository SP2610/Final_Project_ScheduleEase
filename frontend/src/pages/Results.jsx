import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ResultsTimetable from "./ResultsTimeTable";

export default function Results() {
  const [schedules, setSchedules] = useState(null);
  const [error, setError] = useState("");
  const [prefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("prefs") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const chosen = JSON.parse(
      sessionStorage.getItem("selectedCourses") || "[]"
    );
    if (!chosen.length) {
      setSchedules([]);
      return;
    }
    setSchedules(null);
    setError("");
    api
      .post("/schedules/generate", { courses: chosen, prefs })
      .then((res) =>
        setSchedules(res.data?.schedules || res.data?.combinations || [])
      )
      .catch(() => {
        setError("Failed to generate schedules");
        setSchedules([]);
      });
  }, []);

  if (schedules === null) return <p className="muted">Generating…</p>;
  if (error) return <p style={{ color: "#fca5a5" }}>{error}</p>;
  if (!schedules.length)
    return (
      <p className="muted">
        No schedule found. Try removing a course or relaxing prefs.
      </p>
    );

  return (
    <div className="stack">
      <h2 className="h2">
        Results <span className="muted">({schedules.length})</span>
      </h2>

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
              <h3 style={{ margin: 0 }}>Option {idx + 1}</h3>
              {"stats" in sch && (
                <div className="stat">
                  Earliest {sch.stats.earliest} • Latest {sch.stats.latest} •
                  Gaps {sch.stats.gaps}m
                </div>
              )}
            </div>

            <div style={{ margin: "12px 0" }}>
              <ResultsTimetable blocks={sch.blocks || []} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const plans = JSON.parse(
                    localStorage.getItem("plans") || "[]"
                  );
                  const toSave = {
                    id: Date.now(),
                    name: `Plan ${plans.length + 1}`,
                    ...sch,
                    savedAt: new Date().toISOString(),
                  };
                  localStorage.setItem(
                    "plans",
                    JSON.stringify([toSave, ...plans])
                  );
                  alert("Saved!");
                }}
              >
                Save Plan
              </button>
              <button
                className="btn"
                onClick={() => {
                  navigator.clipboard.writeText((sch.crns || []).join(", "));
                  alert("CRNs copied");
                }}
              >
                Copy CRNs
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
