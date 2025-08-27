// frontend/src/components/Header.jsx
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  // dropdown state
  const [userOpen, setUserOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  // refs for outside-click detection
  const userRef = useRef(null);
  const reviewsRef = useRef(null);

  // close dropdowns on outside click
  useEffect(() => {
    function onDoc(e) {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false);
      }
      if (reviewsRef.current && !reviewsRef.current.contains(e.target)) {
        setReviewsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setUserOpen(false);
        setReviewsOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="nav container">
      <div className="bar">
        <div className="brand">
          <NavLink to="/app">SchedulEase</NavLink>
        </div>

        <div
          className="tabs"
          style={{ gap: 8, alignItems: "center" }}
        >
          <NavLink
            className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
            to="/app"
          >
            Home
          </NavLink>
          <NavLink
            className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
            to="/app/plans"
          >
            Plans
          </NavLink>
          <NavLink
            className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
            to="/app/picker"
          >
            Course Picker
          </NavLink>
          <NavLink
            className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
            to="/app/results"
          >
            Results
          </NavLink>

          {/* Reviews dropdown */}
          <div
            ref={reviewsRef}
            style={{ position: "relative" }}
          >
            <button
              className="btn"
              aria-haspopup="menu"
              aria-expanded={reviewsOpen}
              onClick={() => {
                setReviewsOpen((v) => !v);
                setUserOpen(false);
              }}
            >
              Reviews ▾
            </button>
            {reviewsOpen && (
              <div
                className="menu"
                role="menu"
                style={{ left: 0, right: "auto" }}
              >
                <button
                  className="menu-item"
                  onClick={() => {
                    setReviewsOpen(false);
                    nav("/app/reviews/write");
                  }}
                >
                  Write a Review
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setReviewsOpen(false);
                    nav("/app/reviews/read");
                  }}
                >
                  Read Reviews
                </button>
              </div>
            )}
          </div>

          {/* Right side: user chip with dropdown */}
          {user && user !== false && (
            <div
              ref={userRef}
              style={{ marginLeft: 12, position: "relative" }}
            >
              <button
                className="userchip"
                onClick={() => {
                  setUserOpen((v) => !v);
                  setReviewsOpen(false);
                }}
                title={user.email}
                aria-haspopup="menu"
                aria-expanded={userOpen}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="avatar"
                />
                <span
                  className="user-name"
                  style={{
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name}
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M6 8l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {userOpen && (
                <div
                  className="menu"
                  role="menu"
                >
                  <button
                    className="menu-item"
                    onClick={() => {
                      setUserOpen(false);
                      nav("/app/profile");
                    }}
                  >
                    Profile settings
                  </button>
                  <button
                    className="menu-item danger"
                    onClick={() => {
                      setUserOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
