import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./landing.css";

export default function Landing() {
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  async function handleStart() {
    if (!user) {
      await loginWithGoogle(); // demo login
    }
    navigate(from, { replace: true });
  }

  return (
    <div className="landing">
      <div className="hero slide-in">
        <h1>
          Welcome to <span>ScheduleEase</span>
        </h1>
        <p>
          Build the perfect schedule, set preferences, and generate
          conflict-free options instantly.
        </p>

        <div
          className="actions"
          style={{ display: "flex", gap: 10 }}
        >
          <button
            className="btn btn-primary"
            onClick={handleStart}
          >
            {user ? "Enter app" : "Continue with Google (demo)"}
          </button>
          {user && (
            <button
              className="btn"
              onClick={() => navigate("/app")}
            >
              Go to dashboard
            </button>
          )}
        </div>

        <p
          className="muted"
          style={{ marginTop: 10 }}
        >
          (This is a demo sign-in; we’ll switch to real Google Login next.)
        </p>
      </div>
    </div>
  );
}
