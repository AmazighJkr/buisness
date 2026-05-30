#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Building EmbeddedGrid for single-server deploy ==="

echo "[1/4] Frontend..."
cd frontend
npm ci
npm run build
cd ..

echo "[2/4] Copy frontend_dist..."
rm -rf frontend_dist
cp -r frontend/dist frontend_dist

echo "[3/4] Backend migrate + collectstatic..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py ensure_admin || true
cd ..

echo "[4/4] Done. Run: ./deploy/run_production.sh"
