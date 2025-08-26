// frontend/src/components/Header.jsx
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const wrapRef = useRef(null);

  // close dropdown on outside click
  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
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

          {/* Right side: user chip with dropdown */}
          {user && user !== false && (
            <div
              ref={wrapRef}
              style={{ marginLeft: 12, position: "relative" }}
            >
              <button
                className="userchip"
                onClick={() => setOpen((v) => !v)}
                title={user.email}
                aria-haspopup="menu"
                aria-expanded={open}
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

              {open && (
                <div
                  className="menu"
                  role="menu"
                >
                  <button
                    className="menu-item"
                    onClick={() => {
                      setOpen(false);
                      nav("/app/profile");
                    }}
                  >
                    Profile settings
                  </button>
                  <button
                    className="menu-item danger"
                    onClick={() => {
                      setOpen(false);
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
