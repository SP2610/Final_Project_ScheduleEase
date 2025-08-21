import { useEffect, useState } from "react";
import api from "../lib/api"; // default export; see api.js below

export default function Home() {
  const [ping, setPing] = useState({ status: "loading" });

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setPing(res.data))
      .catch(() => setPing({ ok: false, error: "API not reachable" }));
  }, []);

  return (
    <div>
      <h1>Welcome to ScheduleEase</h1>
      <pre>{JSON.stringify(ping, null, 2)}</pre>
    </div>
  );
}
