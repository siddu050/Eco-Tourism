# Eco-Tourism

This repository contains the cleaned project layout for the Indian Journeys eco-tourism app.

## Structure

- `frontend/` React + Vite client
- `backend/` FastAPI + SQLite API
- `docs/` architecture and system design files

## Run The Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`.

## Run The Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python seed.py
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend runs at `http://127.0.0.1:8000`.

## Quick Start Scripts

From the repo root you can also use:

```powershell
.\start-frontend.ps1
.\start-backend.ps1
```

## Notes

- The SQLite database file is kept in `backend/tourism.db` so the app can keep its seed data.
- Create `backend/.env` only if you want to enable Gemini API features. Start from `backend/.env.example`.
