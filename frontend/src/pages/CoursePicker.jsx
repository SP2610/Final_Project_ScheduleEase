import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function CoursePicker() {
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState(() =>
    JSON.parse(sessionStorage.getItem("selectedCourses") || "[]")
  );
  const [prefs, setPrefs] = useState(() =>
    JSON.parse(localStorage.getItem("prefs") || "{}")
  );
  const nav = useNavigate();

  
  useEffect(() => {
    loadCourses("");
  }, []);

  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCourses(searchQuery);
      } else {
        setSearchResults([]);
        loadCourses(""); 
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCourses = async (query) => {
    try {
      setIsSearching(true);
      const response = await api.get("/courses", { params: { q: query } });
      setCourses(response.data || []);
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses([]);
    } finally {
      setIsSearching(false);
    }
  };

  const searchCourses = async (query) => {
    try {
      setIsSearching(true);
      const response = await api.get("/courses", { params: { q: query } });
      setSearchResults(response.data || []);
    } catch (error) {
      console.error("Error searching courses:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleCourse = (course) => {
    const courseCode = `${course.subject}${course.code}`;
    const exists = selected.find(c => c === courseCode);
    
    const next = exists
      ? selected.filter(c => c !== courseCode)
      : [...selected, courseCode];
    
    setSelected(next);
  };

  const removeCourse = (courseCode) => {
    const next = selected.filter(c => c !== courseCode);
    setSelected(next);
  };

  const goResults = async () => {
    if (selected.length === 0) return;
    
    try {
      sessionStorage.setItem("selectedCourses", JSON.stringify(selected));
      localStorage.setItem("prefs", JSON.stringify(prefs));
      

      nav("/app/results");
    } catch (error) {
      console.error("Error navigating to results:", error);
    }
  };

  const isSelected = (course) => {
    const courseCode = `${course.subject}${course.code}`;
    return selected.includes(courseCode);
  };

  const displayCourses = searchQuery.trim() ? searchResults : courses;

  return (
    <div className="stack">
      <section className="card" style={{ padding: 14 }}>
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

      {selected.length > 0 && (
        <section className="card" style={{ padding: 14 }}>
          <h3 className="h2">Selected Courses ({selected.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selected.map((courseCode) => (
              <div
                key={courseCode}
                style={{
                  padding: "4px 8px",
                  background: "rgba(155, 140, 255, 0.1)",
                  border: "1px solid rgba(155, 140, 255, 0.3)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "14px"
                }}
              >
                <span style={{ fontWeight: "600", color: "var(--primary)" }}>
                  {courseCode}
                </span>
                <button
                  onClick={() => removeCourse(courseCode)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "16px",
                    lineHeight: 1
                  }}
                  title="Remove course"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 className="h2">Search Courses</h2>
          {isSearching && <span className="muted" style={{ fontSize: "14px" }}>Searching...</span>}
        </div>
        
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            className="input"
            placeholder="Search courses (e.g., CS, CS100, Computer Science)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div className="course-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {displayCourses.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
              {isSearching ? "Searching..." : searchQuery.trim() ? "No courses found" : "Loading courses..."}
            </div>
          ) : (
            displayCourses.map((c) => {
              const courseCode = `${c.subject}${c.code}`;
              const selected = isSelected(c);
              
              return (
                <label
                  key={courseCode}
                  className={`course-item ${selected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: selected ? "rgba(155, 140, 255, 0.1)" : undefined,
                    borderColor: selected ? "rgba(155, 140, 255, 0.3)" : undefined
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCourse(c)}
                  />
                  <span className="code">
                    {c.subject} {c.code}
                  </span>
                  <span className="title">{c.title}</span>
                </label>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            className="btn btn-primary"
            disabled={!selected.length || isSearching}
            onClick={goResults}
          >
            Generate Schedules ({selected.length || 0} selected)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setSelected([]);
              sessionStorage.removeItem("selectedCourses");
            }}
            disabled={!selected.length}
          >
            Clear All
          </button>
        </div>
      </section>
    </div>
  );
}