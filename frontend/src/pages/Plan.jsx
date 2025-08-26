// frontend/src/pages/Plan.jsx
import { useEffect, useState } from "react";
import ResultsTimetable from "./ResultsTimeTable";

export default function Plan() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    try {
      setPlans(JSON.parse(localStorage.getItem("plans") || "[]"));
    } catch {
      setPlans([]);
    }
  }, []);

  const refresh = () =>
    setPlans(JSON.parse(localStorage.getItem("plans") || "[]"));

  function renamePlan(id) {
    const name = prompt("New name?");
    if (!name) return;
    const next = plans.map((p) => (p.id === id ? { ...p, name } : p));
    localStorage.setItem("plans", JSON.stringify(next));
    setPlans(next);
  }

  function deletePlan(id) {
    if (!confirm("Delete this plan?")) return;
    const next = plans.filter((p) => p.id !== id);
    localStorage.setItem("plans", JSON.stringify(next));
    setPlans(next);
  }

  function copyCRNs(crns = []) {
    navigator.clipboard.writeText(crns.join(", "));
    alert("CRNs copied");
  }

  function exportJSON(plan) {
    const blob = new Blob([JSON.stringify(plan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `${(plan.name || "plan").replace(/\s+/g, "_")}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (plans.length === 0) {
    return (
      <div className="container">
        <h1>Plans</h1>
        <p>
          No saved plans yet. Generate schedules in <strong>Results</strong> and
          click <em>Save Plan</em>.
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Plans</h1>

      <div className="cards">
        {plans.map((p) => (
          <div
            key={p.id}
            className="card"
          >
            <div className="card-header">
              <div>
                <div className="card-title">{p.name}</div>
                <div className="muted">
                  Saved {new Date(p.savedAt || p.id).toLocaleString()}
                </div>
              </div>
              <div className="actions">
                <button onClick={() => renamePlan(p.id)}>Rename</button>
                <button onClick={() => copyCRNs(p.crns)}>Copy CRNs</button>
                <button onClick={() => exportJSON(p)}>Export</button>
                <button
                  className="danger"
                  onClick={() => deletePlan(p.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <ResultsTimetable blocks={p.blocks || []} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
