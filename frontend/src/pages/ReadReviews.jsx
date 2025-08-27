import { useEffect, useState } from "react";
import StarRating from "../components/StarRating";
import { api } from "../lib/api";

export default function ReadReviews() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    const preset = usp.get("q");
    if (preset) {
      setQ(preset);
      doSearch(preset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function splitName(input) {
    const cleaned = String(input).trim();
    if (!cleaned) return { last: "", first: "" };
    const comma = cleaned.split(",");
    if (comma.length >= 2) {
      return { last: comma[0].trim(), first: comma.slice(1).join(",").trim() };
    }
    const parts = cleaned.split(/\s+/);
    return { last: parts[0] || "", first: parts.slice(1).join(" ") || "" };
  }

  async function doSearch(inputQ = q) {
    setErr("");
    setReviews([]);
    const { last } = splitName(inputQ);
    if (!last) {
      setErr('Type a professor like "Last, First"');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/reviews/search`, {
        params: { q: inputQ },
      });
      setReviews(data?.reviews || []);
      if (!data?.reviews?.length)
        setErr("No reviews found for that professor.");
    } catch (e) {
      setErr(e?.response?.data?.error || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function displayProfessor(r) {
    // Prefer stored display; otherwise compose from parts; or fallback
    const display =
      (r.professor && r.professor.trim()) ||
      [r.professorLast, r.professorFirst].filter(Boolean).join(", ");
    return display || "Unknown Professor";
  }

  return (
    <div className="stack">
      <h2 className="h2">Read Reviews</h2>

      <div
        className="card"
        style={{ padding: 16 }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Last name, First name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? doSearch() : null)}
            style={{ flex: 1 }}
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={() => doSearch()}
          >
            Search
          </button>
        </div>

        {loading && (
          <p
            className="muted"
            style={{ marginTop: 12 }}
          >
            Searching…
          </p>
        )}
        {err && !loading && (
          <p
            className="muted"
            style={{ marginTop: 12 }}
          >
            {err}
          </p>
        )}

        {!loading && reviews.length > 0 && (
          <div
            className="stack"
            style={{ marginTop: 16 }}
          >
            {reviews.map((r) => (
              <div
                key={r._id || r.id}
                className="card"
                style={{ padding: 12 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {displayProfessor(r)}
                    {r.courseCode ? (
                      <span className="muted"> • {r.courseCode}</span>
                    ) : null}
                  </div>
                  <div title={`${r.rating}/5`}>
                    <StarRating
                      value={r.rating}
                      onChange={() => {}}
                    />
                  </div>
                </div>

                {r.description && (
                  <p style={{ marginTop: 8 }}>{r.description}</p>
                )}

                <div
                  className="muted"
                  style={{ fontSize: 12 }}
                >
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
