// frontend/src/pages/Landing.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./landing.css"; // uses the new .lp* classes below

export default function Landing() {
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from?.pathname || "/app";

  async function onPrimary() {
    if (!user) await loginWithGoogle();
    navigate(from, { replace: true });
  }

  return (
    <div className="lp">
      {/* full-bleed background */}
      <div
        className="lp-bg"
        aria-hidden
      />

      {/* minimal top bar */}
      <header className="lp-top">
        <div className="lp-brand">SchedulEase</div>
        <nav className="lp-nav">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
          <button
            className="lp-btn lp-btn-ghost"
            onClick={onPrimary}
          >
            {user ? "Enter app" : "Sign in"}
          </button>
        </nav>
      </header>

      {/* centered hero */}
      <main className="lp-hero">
        <div className="lp-hero-inner">
          <p className="lp-pill">New • Fall planning unlocked</p>
          <h1 className="lp-title">
            Build your <span className="lp-grad">perfect</span> schedule
          </h1>
          <p className="lp-sub">
            Pick courses, set preferences, and generate conflict-free options
            instantly. Export to Google Calendar, share with friends, and stay
            on track.
          </p>

          <div className="lp-actions">
            <button
              className="lp-btn lp-btn-primary"
              onClick={onPrimary}
            >
              {user ? "Open Dashboard" : "Continue with Google (demo)"}
            </button>
            <a
              href="#features"
              className="lp-btn lp-btn-outline"
            >
              See features
            </a>
          </div>

          <ul className="lp-badges">
            <li>✓ Google sign-in</li>
            <li>✓ Calendar export</li>
            <li>✓ Share & reviews</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
