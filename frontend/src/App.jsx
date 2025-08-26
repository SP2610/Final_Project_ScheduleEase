// frontend/src/App.jsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import Header from "./components/Header";
import CoursePicker from "./pages/CoursePicker";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Plan from "./pages/Plan";
import Results from "./pages/Results";
import UserProfile from "./pages/UserProfile"; // <-- your renamed profile page

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing */}
        <Route
          path="/"
          element={<Landing />}
        />

        {/* Legacy redirects (old public routes -> protected /app routes) */}
        <Route
          path="/picker"
          element={
            <Navigate
              to="/app/picker"
              replace
            />
          }
        />
        <Route
          path="/results"
          element={
            <Navigate
              to="/app/results"
              replace
            />
          }
        />
        <Route
          path="/plans"
          element={
            <Navigate
              to="/app/plans"
              replace
            />
          }
        />
        {/* NOTE: profile is protected below; remove any public /profile route to avoid blank pages */}

        {/* Protected app */}
        <Route
          path="/app/*"
          element={
            <RequireAuth>
              <Header />
              <main className="container stack">
                <Routes>
                  <Route
                    path=""
                    element={<Home />}
                  />
                  <Route
                    path="picker"
                    element={<CoursePicker />}
                  />
                  <Route
                    path="results"
                    element={<Results />}
                  />
                  <Route
                    path="plans"
                    element={<Plan />}
                  />
                  <Route
                    path="profile"
                    element={<UserProfile />}
                  />{" "}
                  {/* profile lives under /app */}
                </Routes>
              </main>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
