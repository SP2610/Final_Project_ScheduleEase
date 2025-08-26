import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 24 }}>Checking sign-in…</div>;
  }
  if (!user) {
    // Not signed in → bounce to Landing, preserve where they wanted to go
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    );
  }
  return children;
}
