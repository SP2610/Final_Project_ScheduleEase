// frontend/src/pages/WriteReview.jsx
import { useState } from "react";
import StarRating from "../components/StarRating";
import { api } from "../lib/api";

export default function WriteReview() {
  const [name, setName] = useState(""); 
  const [rating, setRating] = useState(5); 
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!name.trim()) {
      setMsg("Please enter the professor name (Last, First or Last First)");
      return;
    }
    if (!description.trim()) {
      setMsg("Please add a short description.");
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await api.post("/reviews", {
        professor: name, 
        rating,
        text: description,
        courseCode: courseCode.toUpperCase() || undefined,
      });
      if (data.ok) {
        setMsg("Review submitted");
        setName("");
        setRating(5);
        setCourseCode("");
        setDescription("");
      } else {
        setMsg(data.error || "Failed to submit review");
      }
    } catch (err) {
      setMsg(err?.response?.data?.error || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <h2 className="h2">Write a Review</h2>

      <form
        className="card"
        style={{ padding: 16 }}
        onSubmit={onSubmit}
      >
 
        <div>
          <label className="muted">Professor’s Name</label>
          <input
            className="input"
            placeholder="Last name, First name (or Last First)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

       
        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 240px", gap: 12, marginTop: 12 }}
        >
          <div>
            <label className="muted">Overall Rating</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <StarRating
                value={rating}
                onChange={setRating}
              />
              <span
                className="muted"
                style={{ fontSize: 13 }}
              >
                {rating}/5
              </span>
            </div>
          </div>
          <div>
            <label className="muted">Course Code (optional)</label>
            <input
              className="input"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g., CS141"
            />
          </div>
        </div>

  
        <div style={{ marginTop: 12 }}>
          <label className="muted">Description</label>
          <textarea
            className="input"
            style={{ width: "100%", height: 140, paddingTop: 8 }}
            placeholder="Share your experience with this professor and class…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

  
        <div
          style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Posting…" : "Post Review"}
          </button>
        </div>

        {msg && (
          <div
            className="muted"
            style={{ marginTop: 8 }}
          >
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}
