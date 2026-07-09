#!/bin/bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="${DATABASE_URL:-file:${PROJECT_DIR}/prisma/prisma/dev.db}"
DB_FILE="${DB_PATH#file:}"
BACKUP_DIR="${PROJECT_DIR}/backups"
MAX_BACKUPS=14

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sqlite3"

if [ ! -f "${DB_FILE}" ]; then
  echo "DB file not found: ${DB_FILE}"
  exit 1
fi

sqlite3 "${DB_FILE}" ".backup '${BACKUP_FILE}'"

find "${BACKUP_DIR}" -maxdepth 1 -name "db_*.sqlite3" -type f -printf "%T@ %p\n" | sort -nr | awk "NR>${MAX_BACKUPS} {print \$2}" | xargs -r rm -f

echo "backup=${BACKUP_FILE}"
echo "count=$(find "${BACKUP_DIR}" -maxdepth 1 -name 'db_*.sqlite3' -type f | wc -l)"
