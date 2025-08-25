import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function CoursePicker() {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(() =>
    JSON.parse(sessionStorage.getItem("selectedCourses") || "[]")
  );
  const [prefs, setPrefs] = useState(() =>
    JSON.parse(localStorage.getItem("prefs") || "{}")
  );
  const nav = useNavigate();

  useEffect(() => {
    api.get("/courses").then((r) => setCourses(r.data || []));
  }, []);

  const toggle = (c) => {
    const key = c.subject + " " + c.code;
    const exists = selected.find(
      (x) => x.subject === c.subject && x.code === c.code
    );
    const next = exists
      ? selected.filter((x) => !(x.subject === c.subject && x.code === c.code))
      : [...selected, { subject: c.subject, code: c.code }];
    setSelected(next);
  };

  const goResults = () => {
    sessionStorage.setItem("selectedCourses", JSON.stringify(selected));
    localStorage.setItem("prefs", JSON.stringify(prefs));
    nav("/results");
  };

  return (
    <div className="stack">
      <section
        className="card"
        style={{ padding: 14 }}
      >
        <h2 className="h2">Preferences</h2>
        <div className="prefs">
          <label>
            <input
              type="checkbox"
              checked={!!prefs.noFriday}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, noFriday: e.target.checked }))
              }
            />{" "}
            Avoid Friday classes
          </label>
          <label>
            Start after{" "}
            <input
              className="time"
              type="time"
              value={prefs.startAfter || ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, startAfter: e.target.value }))
              }
            />
          </label>
          <label>
            End before{" "}
            <input
              className="time"
              type="time"
              value={prefs.endBefore || ""}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, endBefore: e.target.value }))
              }
            />
          </label>
        </div>
      </section>

      <section
        className="card"
        style={{ padding: 14 }}
      >
        <h2 className="h2">Courses</h2>
        <div className="course-list">
          {courses.map((c) => (
            <label
              key={c.subject + c.code}
              className="course-item"
            >
              <input
                type="checkbox"
                checked={
                  !!selected.find(
                    (x) => x.subject === c.subject && x.code === c.code
                  )
                }
                onChange={() => toggle(c)}
              />
              <span className="code">
                {c.subject} {c.code}
              </span>
              <span className="title">{c.title}</span>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            className="btn btn-primary"
            disabled={!selected.length}
            onClick={goResults}
          >
            Generate schedules ({selected.length || 0} selected)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setSelected([]);
              sessionStorage.removeItem("selectedCourses");
            }}
          >
            Clear
          </button>
        </div>
      </section>
    </div>
  );
}
