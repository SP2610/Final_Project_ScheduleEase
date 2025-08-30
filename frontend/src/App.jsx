import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import Header from "./components/Header";

import CoursePicker from "./pages/CoursePicker";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Plan from "./pages/Plan";
import Results from "./pages/Results";
import UserProfile from "./pages/UserProfile";


import ReadReviews from "./pages/ReadReviews";
import WriteReview from "./pages/WriteReview";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Landing />}
        />
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
