start cmd /k "cd backend && .venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"
start cmd /k "cd frontend && npm run dev"
