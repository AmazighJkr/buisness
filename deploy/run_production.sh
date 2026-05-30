#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
source .venv/bin/activate
if [[ ! -f .env ]]; then
  echo "Copy .env.example to backend/.env first."
  exit 1
fi
if [[ ! -f frontend_dist/index.html ]]; then
  echo "Run ./deploy/build.sh first."
  exit 1
fi
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
