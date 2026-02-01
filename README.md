# Playto Pulse - Community Feed

A Reddit-like community feed with threaded comments and a 24h dynamic leaderboard.

## Features
- **Tree-Structured Comments**: Infinite nesting (calculated in-memory via Adjacency List).
- **Gamified Leaderboard**: Dynamic SQL aggregation of Karma (Last 24h only).
  - Post Like = 5 pts
  - Comment Like = 1 pt
- **Concurrency Support**: Database constraints to prevent double-voting.
- **Optimized Queries**: Solves N+1 problem on recursive comments.

## Tech Stack
- **Backend**: Django, Django REST Framework, SQLite (for demo)
- **Frontend**: React (Vite), Tailwind CSS

## Quick Start (Manual)

### 1. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
API runs at [http://127.0.0.1:8000](http://127.0.0.1:8000).

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs at [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Running with Docker (Optional)
```bash
docker-compose up --build
```

## Testing
Run the backend test suite (includes Leaderboard logic verification):
```bash
cd backend
python manage.py test
```

## Documentation
See [EXPLAINER.md](./EXPLAINER.md) for deeper technical details on:
1. The Tree Implementation
2. The Leaderboard Math
3. The AI Audit (Bug Fix)
