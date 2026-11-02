#!/bin/bash
set -euo pipefail
# Private local preview; this never uploads database contents or credentials.
SOURCE_COMMIT='aa3921abe9120545354c20d830597acd23c2cb28'
APP="$HOME/Downloads/AI Influencer Studio Monterey"
PG_BIN='/Applications/Postgres.app/Contents/Versions/16/bin'
fail(){ printf '\n%s\nPress Return to close. ' "$1"; read -r unused || true; exit 1; }
trap 'fail "Update stopped. Your original data and private credentials have not been deleted. Keep the backup folder and share only the error message."' ERR
if [ ! -f "$APP/source/.env" ]; then
 APP=$(osascript -e 'POSIX path of (choose folder with prompt "Choose your existing AI Influencer Studio Monterey folder")')
 APP=${APP%/}
fi
[ -f "$APP/source/.env" ] && [ -f "$APP/.local/database/PG_VERSION" ] || fail 'Choose the existing working Studio folder. Do not use a new empty folder.'
[ -x "$PG_BIN/pg_dump" ] || fail 'Postgres.app with PostgreSQL 16 must remain installed.'
[ -f "$APP/.local/database-password" ] || fail 'The private database configuration is missing. Keep the folder and ask for help.'
umask 077
mkdir -p "$APP/.local/backups"
BACKUP=$(mktemp -d "$APP/.local/backups/before-phase2-XXXXXX")
printf '\nPreparing a private backup before installing the Phase 2 preview…\n'
/bin/bash "$APP/Stop Studio.command"
for attempt in $(seq 1 30); do
 if ! lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then break; fi
 sleep 1
done
if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then fail 'Port 3000 is still in use. Wait for the Studio to stop and retry.'; fi
"$PG_BIN/pg_ctl" -D "$APP/.local/database" -l "$APP/.local/database.log" -w -t 30 start
export PGPASSWORD="$(tr -d '\r\n' < "$APP/.local/database-password")"
"$PG_BIN/pg_dump" -h 127.0.0.1 -p 55432 -U studio -d studio -Fc -f "$BACKUP/database.dump"
unset PGPASSWORD
cp "$APP/source/.env" "$BACKUP/private-environment.env"
tar --exclude='./node_modules' --exclude='./.next' --exclude='./.local' -czf "$BACKUP/source.tgz" -C "$APP/source" .
chmod 600 "$BACKUP/database.dump" "$BACKUP/private-environment.env" "$BACKUP/source.tgz"
WORK=$(mktemp -d "$APP/.local/phase2-download-XXXXXX")
trap 'rm -rf "$WORK"' EXIT
printf '\nDownloading the reviewed Phase 2 source snapshot…\n'
curl --fail --location --proto '=https' --tlsv1.2 -o "$WORK/source.zip" "https://github.com/Benzmaks/ai-influencer-studio/archive/$SOURCE_COMMIT.zip"
ditto -x -k "$WORK/source.zip" "$WORK"
NEW="$WORK/ai-influencer-studio-$SOURCE_COMMIT"
[ -f "$NEW/package.json" ] && [ -f "$NEW/prisma/migrations/202611020002_character_drafts/migration.sql" ] || fail 'The source download is incomplete. The original source is still backed up.'
# No --delete: retain private environment, local assets and any user files.
rsync -a --exclude='.env' --exclude='.env.*' --exclude='.local' --exclude='.next' --exclude='node_modules' "$NEW/" "$APP/source/"
printf '\nPhase 2 preview installed. Your database and private login remain in place.\nA private backup is stored inside .local/backups. Never share that folder.\nThe existing starter will apply the additive migration and reopen your browser.\n'
/bin/bash "$APP/Start Studio.command"
