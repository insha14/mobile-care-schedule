# Mobile Care Schedule

This project is a simple local web app to collect weekly employee restrictions and show them in a manager dashboard.

Structure:
- frontend/ — Vite + React app (mobile-friendly form + manager dashboard)
- backend/ — Node.js + Express API with JSON storage (lowdb)

Quick start (Windows):

1) Backend

```
cd backend
npm install
npm run start
```

Server will run on http://localhost:4000

2) Frontend (in a separate terminal)

```
cd frontend
npm install
npm run dev
```

The frontend dev server uses Vite and typically runs on http://localhost:5173 — open it in your phone browser or use the desktop to test.

What to test first:
- Open the frontend, go to "Employee Form", submit a restriction for next Monday.
- Switch to "Manager Dashboard", choose the same week, and verify your submission appears and missing employees are listed.
