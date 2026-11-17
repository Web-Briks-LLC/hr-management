#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
archive="${1:?Usage: make restore BACKUP=/path/to/backup.archive.gz}"
[[ -f "$archive" ]] || { echo 'Backup file does not exist.'; exit 1; }
# Fixed container and namespace: this command cannot target the production DB.
# --drop replaces matching collections in the LOCAL database only.
docker compose exec -T mongo mongorestore --host 127.0.0.1 \
  --gzip --archive --stopOnError --drop \
  --nsInclude='hr-management.*' \
  --nsFrom='hr-management.*' --nsTo='hr-management-local.*' < "$archive"
