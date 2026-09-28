#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "           🚀 Launching GEOAuditor MVP                   "
echo "=========================================================="

# Check for backend virtual environment
if [ ! -d "backend/venv" ]; then
    echo "Creating backend virtualenv..."
    python3 -m venv backend/venv
    ./backend/venv/bin/pip install -r backend/requirements.txt
fi

# Ensure frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "Starting FastAPI backend on http://127.0.0.1:8000..."
(cd backend && ./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
BACKEND_PID=$!

echo "Starting Next.js frontend on http://localhost:3000..."
(cd frontend && npm run dev -- -p 3000) &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Shutting down GEOAuditor servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

echo ""
echo "✅ Both servers are running!"
echo "   👉 Frontend:   http://localhost:3000"
echo "   👉 Backend:    http://127.0.0.1:8000"
echo "   👉 API Docs:   http://127.0.0.1:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

wait
