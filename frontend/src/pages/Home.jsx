import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="stack">
      <section className="card hero">
        <h1 className="h1">
          Build the <span className="accent">perfect schedule</span>,
          effortlessly.
        </h1>
        <p className="muted">
          Pick your courses, set preferences, and let SchedulEase generate
          conflict-free options instantly.
        </p>
        <div className="actions">
          <Link
            className="btn btn-primary"
            to="/picker"
          >
            Get started
          </Link>
          <Link
            className="btn"
            to="/results"
          >
            View results
          </Link>
          <a
            className="btn-link"
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
          >
            Preview
          </a>
        </div>
      </section>

      <section
        className="card"
        style={{ padding: 12 }}
      >
        <div className="timetablePreview">Timetable preview</div>
      </section>
    </div>
  );
}
