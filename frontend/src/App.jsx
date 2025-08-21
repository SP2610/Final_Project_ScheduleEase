import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <Link
          to="/"
          style={{ marginRight: 12 }}
        >
          Home
        </Link>
      </nav>
      <div style={{ padding: 16 }}>
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
