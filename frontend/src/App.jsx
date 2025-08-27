// frontend/src/App.jsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import Header from "./components/Header";

import CoursePicker from "./pages/CoursePicker";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Plan from "./pages/Plan";
import Results from "./pages/Results";
import UserProfile from "./pages/UserProfile";

// NEW: reviews pages
import ReadReviews from "./pages/ReadReviews";
import WriteReview from "./pages/WriteReview";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing */}
        <Route
          path="/"
          element={<Landing />}
        />

        {/* Legacy redirects (public) -> protected /app paths */}
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
                  />

                  {/* Reviews (NOTE: relative paths, not /app/...) */}
                  <Route
                    path="reviews/write"
                    element={<WriteReview />}
                  />
                  <Route
                    path="reviews/read"
                    element={<ReadReviews />}
                  />
                </Routes>
              </main>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
