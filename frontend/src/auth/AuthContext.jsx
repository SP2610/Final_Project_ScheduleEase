// frontend/src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

// local key for user overrides we store on this device
const OVERRIDES_KEY = "userOverrides";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=logged-out, object
  const [loading, setLoading] = useState(true);

  // Load current session (if any) + apply local overrides (name/avatar)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/me");
        const baseUser = data?.user || false;

        // merge overrides if available
        let u = baseUser;
        if (baseUser && typeof baseUser === "object") {
          try {
            const overrides = JSON.parse(
              localStorage.getItem(OVERRIDES_KEY) || "{}"
            );
            u = { ...baseUser, ...overrides };
          } catch {}
        }
        if (alive) setUser(u);
      } catch {
        if (alive) setUser(false);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function loginWithGoogle() {
    window.location.href = "http://localhost:3000/api/auth/google";
  }

  async function logout() {
    try {
      await api.post("/logout");
    } catch {}
    setUser(false);
  }

  // Save local-only profile edits (display name & avatar url/data)
  function updateProfile(partial) {
    if (!user || user === false) return;
    const next = { ...user, ...partial };
    setUser(next);
    try {
      // only store the overridable fields
      const save = {};
      if (partial.name !== undefined) save.name = partial.name;
      if (partial.avatarUrl !== undefined) save.avatarUrl = partial.avatarUrl;
      const existing = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
      localStorage.setItem(
        OVERRIDES_KEY,
        JSON.stringify({ ...existing, ...save })
      );
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, loginWithGoogle, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
