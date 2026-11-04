#!/bin/sh
# Proves the newest backup can be restored, without touching the live data:
# restores it into a scratch database, counts what is in it, and drops it.
#
#   docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
#     exec backup sh /restore-check.sh
set -eu

latest=$(ls -1t /backups/ecomap-*.dump 2>/dev/null | head -n 1)
if [ -z "$latest" ]; then
  echo "restore-check: no backups in /backups yet" >&2
  exit 1
fi

echo "restore-check: restoring $latest into a scratch database"
dropdb --if-exists restore_check
createdb restore_check
pg_restore --no-owner --dbname=restore_check "$latest"

psql --dbname=restore_check --tuples-only --no-align --command "
  select 'layers:   ' || count(*) from layers
  union all select 'places:   ' || count(*) from features
  union all select 'people:   ' || count(*) from users
  union all select 'photos:   ' || count(*) from feature_images"

dropdb restore_check
echo "restore-check: OK - the backup restores"
