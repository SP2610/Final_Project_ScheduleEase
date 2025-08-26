import { Link, NavLink, Route, Routes } from "react-router-dom"; // <-- add Link here
import "./App.css";
import CoursePicker from "./pages/CoursePicker";
import Home from "./pages/Home";
import Plan from "./pages/Plan";
import Results from "./pages/Results";

export default function App() {
  return (
    <>
      <div className="nav container">
        <div className="bar">
          <div className="brand">
            <NavLink to="/">SchedulEase</NavLink>
          </div>
          <div className="tabs">
            <NavLink
              className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
              to="/"
            >
              Home
            </NavLink>
            <Link
              className="tab"
              to="/plans"
            >
              Plans
            </Link>{" "}
            {/* optional: make it styled like the others */}
            <NavLink
              className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
              to="/picker"
            >
              Course Picker
            </NavLink>
            <NavLink
              className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
              to="/results"
            >
              Results
            </NavLink>
          </div>
        </div>
      </div>

      <main className="container stack">
        <Routes>
          <Route
            path="/plans"
            element={<Plan />}
          />
          <Route
            path="/"
            element={<Home />}
          />
          <Route
            path="/picker"
            element={<CoursePicker />}
          />
          <Route
            path="/results"
            element={<Results />}
          />
        </Routes>
      </main>
    </>
  );
}
