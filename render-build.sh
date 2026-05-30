#!/usr/bin/env bash
# Render.com build — runs from repository root (must use LF line endings)
set -eu
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "=== Render build: EmbeddedGrid ==="

echo "[1/5] Frontend..."
cd frontend
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build
cd ..

echo "[2/5] Copy build to backend/frontend_dist..."
rm -rf backend/frontend_dist
cp -r frontend/dist backend/frontend_dist
test -f backend/frontend_dist/index.html || { echo "ERROR: frontend build missing index.html"; exit 1; }
echo "  OK: $(wc -c < backend/frontend_dist/index.html) bytes index.html"

echo "[3/5] Python packages..."
cd backend
pip install -r requirements.txt

echo "[4/5] collectstatic + migrate..."
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py repair_migration_0009 || true

echo "[5/5] admin + optional demo data..."
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  python manage.py ensure_admin --password "$ADMIN_PASSWORD"
else
  python manage.py ensure_admin || true
fi
if [ "${SEED_DEMO:-false}" = "true" ]; then
  python manage.py seed_demo || true
fi

echo "=== Build complete ==="
