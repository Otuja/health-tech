#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

if [ -n "$DATABASE_URL" ]; then
    echo "[BUILD] Connected to persistent PostgreSQL database."
else
    echo "[BUILD] WARNING: DATABASE_URL is not set! Using ephemeral SQLite (data will be lost on redeploy)."
fi

python manage.py collectstatic --no-input
python manage.py migrate
python create_test_users.py
