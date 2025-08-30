
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [previewBlocks, setPreviewBlocks] = useState([]);

  const loadLatestPlan = () => {
    try {
      const plans = JSON.parse(localStorage.getItem("plans") || "[]");
      if (plans.length > 0) {
        setPreviewBlocks(plans[0].blocks || []);
      } else {
        setPreviewBlocks([]);
      }
    } catch {
      setPreviewBlocks([]);
    }
  };

  useEffect(() => {
    loadLatestPlan();
    const onStorage = (e) => {
      if (e.key === "plans") loadLatestPlan();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const hasPreview = previewBlocks && previewBlocks.length > 0;

  return (
    <div className="container stack">
      <section className="card hero cardlike fade-up">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px,1fr) minmax(260px,1fr)",
            gap: 22,
            alignItems: "center",
          }}
        >
          <div>
            <h1 className="display">
              Build the <span className="grad">perfect schedule</span>,
              effortlessly.
            </h1>
            <p
              className="lead"
              style={{ marginTop: 10, maxWidth: 560 }}
            >
              Pick your courses, set preferences, and let SchedulEase generate
              conflict-free options instantly.
            </p>
            <div className="actions">
              <NavLink
                to="/app/picker"
                className="btn btn-primary btn-lg"
              >
                Get started
              </NavLink>
              <NavLink
                to="/app/results"
                className="btn btn-outline btn-lg"
              >
                View results
              </NavLink>
              <button
                className="btn btn-ghost btn-lg"
                onClick={() => navigate("/app/results")}
                title="Generate / view schedules from your current selection"
              >
                Preview (from selection)
              </button>
            </div>
          </div>

          <div
            className="center"
            style={{ position: "relative" }}
          >
            <div
              id="preview"
              className="timetablePreview float"
              style={{
                width: "100%",
                position: "relative",
                cursor: hasPreview ? "pointer" : "default",
              }}
              onClick={() => {
                navigate(hasPreview ? "/app/plans" : "/app/results");
              }}
            >
              {!hasPreview ? (
                <EmptyPreview onRefresh={loadLatestPlan} />
              ) : (
                <>
                  <MiniTimetable blocks={previewBlocks} />
                  <OverlayControls onRefresh={loadLatestPlan} />
                </>
              )}
              <div className="pulse-ring" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyPreview({ onRefresh }) {
  return (
    <div style={{ textAlign: "center", padding: 14 }}>
      <div
        style={{
          fontWeight: 800,
          letterSpacing: 0.3,
          marginBottom: 8,
          opacity: 0.9,
        }}
      >
        Timetable preview
      </div>
      <div
        className="muted"
        style={{ fontSize: 13, lineHeight: 1.4 }}
      >
        Save a schedule from <strong>Results</strong> (click{" "}
        <em>Save Schedule</em>) and it will appear here.
      </div>
      <button
        className="btn"
        style={{ marginTop: 10, padding: "8px 10px" }}
        onClick={(e) => {
          e.stopPropagation();
          onRefresh();
        }}
      >
        Refresh
      </button>
    </div>
  );
}

function OverlayControls({ onRefresh }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        display: "flex",
        gap: 6,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="btn btn-ghost"
        style={{ padding: "6px 10px", fontSize: 12, borderRadius: 8 }}
        onClick={onRefresh}
        title="Reload latest saved plan"
      >
        Refresh
      </button>
    </div>
  );
}

function MiniTimetable({ blocks }) {
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const byDay = useMemo(() => {
    const map = Object.fromEntries(order.map((d) => [d, []]));
    (blocks || []).forEach((b) => {
      const k = b.day || "";
      if (map[k]) map[k].push(b);
    });
    order.forEach((d) => {
      map[d].sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    });
    return map;
  }, [blocks]);

  return (
    <div
      className="timetable"
      style={{
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 10,
        padding: 12,
        width: "100%",
      }}
    >
      {order.map((day) => (
        <div
          key={day}
          className="day"
          style={{ minHeight: 0 }}
        >
          <h5 style={{ margin: "0 0 6px", fontSize: 12, opacity: 0.9 }}>
            {day}
          </h5>
          {byDay[day].length === 0 ? (
            <div
              className="muted"
              style={{ fontSize: 12, opacity: 0.7 }}
            >
              —
            </div>
          ) : (
            byDay[day].map((b, i) => (
              <div
                key={`${day}-${i}`}
                className="block"
                style={{
                  marginBottom: 6,
                  padding: 6,
                  fontSize: 11,
                  lineHeight: 1.25,
                  background: "rgba(160,168,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                title={`${b.title} • ${b.start}–${b.end}`}
              >
                <div
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontWeight: 700,
                    marginBottom: 2,
                  }}
                >
                  {shortenTitle(b.title)}
                </div>
                <div
                  className="muted"
                  style={{ fontSize: 10 }}
                >
                  {b.start}–{b.end}
                </div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function shortenTitle(t = "") {
  const m = t.match(/^([A-Z]+\d+[A-Z]*)/);
  if (m) {
    const code = m[1];
    const kind = (t.match(/\b(LEC|LAB|DIS)\b/i) || [])[1] || "";
    return kind ? `${code} ${kind.toUpperCase()}` : code;
  }
  return t.length > 22 ? t.slice(0, 21) + "…" : t;
}
