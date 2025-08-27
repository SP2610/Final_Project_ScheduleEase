// frontend/src/components/StarRating.jsx
import { useState } from "react";

export default function StarRating({
  value = 5,
  onChange,
  size = 22,
  readOnly = false,
}) {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  const current = hover || value;

  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      style={{ display: "inline-flex", gap: 6 }}
    >
      {stars.map((n) => {
        const active = current >= n;
        const common = {
          width: size,
          height: size,
          lineHeight: 1,
          borderRadius: 6,
          background: "transparent",
          border: "1px solid rgba(0,0,0,0.08)",
          display: "grid",
          placeItems: "center",
          padding: 0,
        };
        if (readOnly) {
          return (
            <div
              key={n}
              aria-hidden
              style={common}
            >
              <span
                style={{
                  color: active ? "#F59E0B" : "#cbd5e1",
                  fontSize: size - 4,
                }}
              >
                ★
              </span>
            </div>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange?.(n)}
            title={`${n} star${n > 1 ? "s" : ""}`}
            style={{ ...common, cursor: "pointer" }}
          >
            <span
              style={{
                color: active ? "#F59E0B" : "#cbd5e1",
                fontSize: size - 4,
              }}
            >
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
}
