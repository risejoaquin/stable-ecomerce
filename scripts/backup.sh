#!/bin/bash
# Backup script for Supabase Database
# Usage: ./scripts/backup.sh
# Note: You need pg_dump installed on your local machine.

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL environment variable is not set."
  echo "Example: export SUPABASE_DB_URL='postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres'"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="backup_${TIMESTAMP}.sql"

echo "Starting backup..."
pg_dump "$SUPABASE_DB_URL" --clean --if-exists > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "Backup successful: $FILENAME"
else
  echo "Backup failed!"
  exit 1
fi
