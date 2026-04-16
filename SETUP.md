# Local Setup

This project has two parts:

- `backend` - FastAPI server
- `frontend` - Vite React app

Open two terminals so both can run at the same time.

## Backend

From the project root:

```powershell
cd backend
.venv\Scripts\python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

## Frontend

From the project root:

```powershell
cd frontend
npm.cmd run dev
```

## Website Address

Open the frontend in your browser at:

```text
http://127.0.0.1:5173
```

## Notes

- Keep the backend running on `127.0.0.1:8000`.
- Keep the frontend running on `127.0.0.1:5173`.
- The frontend is already set up to call the backend at `http://127.0.0.1:8000`.
