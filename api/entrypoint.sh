#!/bin/sh
# Container entrypoint. Idempotent — safe to run on every restart.
#
#  1. Generate APP_KEY once, persist it on the SQLite volume so it survives
#     container restarts. Avoids shipping a known key in the image / compose
#     file.
#  2. Touch the SQLite DB file with relaxed perms (the migrations need to
#     write to it from inside the PHP process).
#  3. Run migrations and idempotent seeders. Seeders use updateOrCreate /
#     INSERT OR IGNORE so re-runs are no-ops.
#  4. Exec the supplied command (the dev server in compose, or whatever the
#     production orchestrator wants).
set -eu

DB_PATH="${DB_DATABASE:-/var/lib/sqlite/database.sqlite}"
KEY_PATH="$(dirname "$DB_PATH")/.app_key"

if [ -z "${APP_KEY:-}" ]; then
    if [ ! -f "$KEY_PATH" ]; then
        # `php artisan key:generate --show` prints "base64:..." and exits.
        php artisan key:generate --show > "$KEY_PATH"
        chmod 0600 "$KEY_PATH" 2>/dev/null || true
    fi
    APP_KEY="$(cat "$KEY_PATH")"
    export APP_KEY
fi

touch "$DB_PATH"
chmod 0666 "$DB_PATH" 2>/dev/null || true

php artisan migrate --force --graceful
php artisan db:seed --force --class=Database\\Seeders\\UserSeeder
php artisan db:seed --force --class=Database\\Seeders\\FeatureFlagSeeder
php artisan db:seed --force --class=Database\\Seeders\\DamageReportSeeder

exec "$@"
