// frontend/src/pages/Landing.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./landing.css";

export default function Landing() {
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleStart() {
    try {
      // demo login (or real Google if wired)
      await loginWithGoogle?.();
    } catch (e) {
      // swallow demo errors to keep UX smooth
      console.warn("loginWithGoogle error:", e?.message || e);
    } finally {
      navigate("/app", { replace: true });
    }
  }

  return (
    <div className="landing">
      <div className="noise" />

      {/* Top bar */}
      <header className="landing-top">
        <div className="brand">SchedulEase</div>
        <nav className="top-nav">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
          {!user && (
            <button
              className="btn-ghost sm"
              type="button"
              onClick={handleStart}
            >
              Sign in
            </button>
          )}
        </nav>
      </header>

      {/* Centered hero */}
      <main className="hero-full">
        <div className="hero-container">
          <div className="hero-copy fade-up">
            <span className="pill">New • Fall planning unlocked</span>
            <h1 className="display">
              Build a <span className="grad">schedule</span> in
              <br />
              <span className="grad">minutes</span>
            </h1>
            <p className="lead">
              Pick courses, set preferences, and we’ll generate conflict-free
              combinations. Export to Google Calendar, share with friends, and
              stay on track.
            </p>

            <div className="cta">
              <button
                type="button"
                className="btn-lg btn-primary"
                onClick={handleStart}
              >
                {user ? "Enter app" : "Continue with Google (demo)"}
              </button>
              <a
                href="#features"
                className="btn-lg btn-outline"
              >
                See features
              </a>
            </div>

            <ul className="badges">
              <li>✓ Google sign-in</li>
              <li>✓ Calendar export</li>
              <li>✓ Share & reviews</li>
            </ul>
          </div>

          <div className="hero-visual float-in">
            <div className="preview">
              <div className="chrome">
                <div className="chrome-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="mini-week">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                    <div
                      className="col"
                      key={d}
                    >
                      <div className="label">{d}</div>
                      <div className="cell"></div>
                      <div className="cell tall"></div>
                      <div className="cell"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* (Optional) sections — keep anchors for the header links */}
      <section
        id="features"
        style={{ height: 1 }}
      />
      <section
        id="how"
        style={{ height: 1 }}
      />
      <section
        id="faq"
        style={{ height: 1 }}
      />
    </div>
  );
}
