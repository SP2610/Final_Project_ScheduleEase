# Final_Project_ScheduleEase

It is a for a final project of Web Development course, done by Poojan and Aaron

This repo contains the initial setup for our full-stack project.
Right now, the focus is on creating a clean separation between frontend (React + Vite) and backend (Express).
Both ends are connected via a test GET /api/health endpoint to confirm communication.

Stack Used

Frontend
• React 18 with Vite (fast dev server, modern build tool).
• Axios (for API requests).
• Basic HealthCheck component fetches from backend and displays status.

Backend
• Node.js + Express (API server).
• One test route:
• GET /api/health → returns {"message": "API is working"}

How to Run Locally:
Backend:
cd backend
npm install
npm run dev
Backend runs on http://localhost:3000 by default

Frontend:
cd frontend
npm install
npm run dev
Frontend runs on http://localhost:5173 by default.

Frontend Axios calls → http://localhost:3000/api/health
If everything is running, the frontend shows “API is working” from the backend.

Hey Aaron, here’s what’s ready for you:
• Server is up and running → Express is already wired with a /api/health endpoint.
• What you should do next:

1. Add real API routes under /api/... (e.g., /api/users, /api/tasks, etc.).
2. Connect to a database (MongoDB, PostgreSQL, or whatever we decide).
   • Put DB connection logic in a separate config/ file.
3. Keep routes modular → make a /routes folder and create files for each resource.
4. Use environment variables:
   • Copy .env.example → .env
   • Add DB connection string, PORT, etc.
   • Don’t worry about frontend setup — I’ll handle that part separately in my branch.
   • Just focus on APIs + DB. Once routes are ready, I’ll hook them into the frontend.

---------------------x------------------x---------------x----------------x-------------------x----------

1. What’s already set up

1.1 Backend (Node + Express)
• Packages: express, cors, morgan, dotenv (+ nodemon for dev).
• Server file: backend/server.js
• Middleware:
• cors allowing requests from http://localhost:5173
• express.json({ limit: '64kb' })
• morgan('dev') request logging
• Health route:
• GET /api/health → {"ok": true, "service": "api"}

Run it:
cd backend
npm install
npm run dev # starts nodemon on http://localhost:3000

Check
• http://localhost:3000/api/health should return the JSON above.

Env file
• backend/.env
PORT=3000
(never commit secrets; add more values here later)

1.2 Frontend (React + Vite)
• Packages: react, react-dom, react-router-dom, axios
• App entry: frontend/src/main.jsx
• Router + Home page: frontend/src/App.jsx + frontend/src/pages/Home.jsx
• Axios instance: frontend/src/lib/api.js

import axios from "axios";
const api = axios.create({
baseURL: "http://localhost:3000/api",
withCredentials: true,
timeout: 5000,
});
export default api;

Home page pings backend:
useEffect(() => {
api.get("/health").then(r => setPing(r.data)).catch(() => setPing({ ok:false }));
}, []);

Run it:
cd frontend
npm install
npm run dev # opens http://localhost:5173

Check
• Home shows Welcome to SchedulEase and the JSON from /api/health.

2. How the pieces talk (end-to-end)

- Browser loads React app from Vite at http://localhost:5173.
- React (Home page) calls Axios instance → GET http://localhost:3000/api/health.
- Express receives the request and returns JSON. 4. React displays that JSON.
  This proves CORS + routes + Axios + environment are correctly wired.

⸻

3. Branching & workflow (1-week plan)
   • We initialized everything on main so it’s easy to pull and run.
   • Next:
   • Aaron: branch from main → backend-routes (or similar).
   • Poojan: branch from main → frontend-setup.
