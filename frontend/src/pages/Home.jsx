// frontend/src/pages/Home.jsx
import { NavLink } from "react-router-dom";

export default function Home() {
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
              <a
                href="#preview"
                className="btn btn-ghost btn-lg"
              >
                Preview
              </a>
            </div>
          </div>

          <div
            className="center"
            style={{ position: "relative" }}
          >
            <div
              id="preview"
              className="timetablePreview float"
              style={{ width: "100%" }}
            >
              Timetable preview
              <div className="pulse-ring" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
