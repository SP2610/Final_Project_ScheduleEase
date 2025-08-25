import { useEffect, useState } from "react";

export default function Plan() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    try {
      setPlans(JSON.parse(localStorage.getItem("plans") || "[]"));
    } catch {
      setPlans([]);
    }
  }, []);

  const copy = (crns) => {
    navigator.clipboard.writeText(crns.join(", "));
    alert("CRNs copied");
  };

  const remove = (id) => {
    const next = plans.filter((p) => p.id !== id);
    setPlans(next);
    localStorage.setItem("plans", JSON.stringify(next));
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Saved Plans</h2>
      {!plans.length && <p>No plans yet.</p>}
      {plans.map((p) => (
        <div
          key={p.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{p.name}</strong>
            <span style={{ color: "#64748b" }}>
              {new Date(p.savedAt).toLocaleString()}
            </span>
          </div>
          <div style={{ marginTop: 8, color: "#0f172a" }}>
            CRNs: {(p.crns || []).join(", ")}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => copy(p.crns || [])}>Copy CRNs</button>
            <button onClick={() => window.print()}>Print / Save as PDF</button>
            <button onClick={() => remove(p.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
