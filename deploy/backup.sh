#!/bin/sh
# Nightly database backups, run by the "backup" service in docker-compose.yml.
#
# Writes a compressed dump (pg_dump custom format) to deploy/backups/ once at
# start-up and then every day at BACKUP_HOUR (UTC), and deletes dumps older
# than BACKUP_KEEP_DAYS. Copy that folder off the server too - see docs/deploy.md.
set -u

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
HOUR="${BACKUP_HOUR:-3}"

backup() {
  file="/backups/ecomap-$(date -u +%Y-%m-%d_%H%M).dump"
  if pg_dump --format=custom --file="$file.partial"; then
    mv "$file.partial" "$file"
    echo "backup: wrote $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.partial"
    echo "backup: FAILED at $(date -u)" >&2
  fi
  find /backups -name 'ecomap-*.dump' -mtime +"$KEEP_DAYS" -delete
}

mkdir -p /backups
until pg_isready --quiet; do sleep 2; done

backup
while true; do
  now=$(date -u +%s)
  next=$(date -u -d "today ${HOUR}:00" +%s)
  [ "$next" -le "$now" ] && next=$(date -u -d "tomorrow ${HOUR}:00" +%s)
  sleep $((next - now))
  backup
done
