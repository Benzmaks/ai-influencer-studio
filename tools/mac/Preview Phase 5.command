#!/bin/bash
set -euo pipefail
# Private local preview; this never uploads database contents or credentials.
SOURCE_COMMIT='1236de028a9232f3e3169ac684cf82a5b7b1fcb0'
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
BACKUP=$(mktemp -d "$APP/.local/backups/before-phase5-XXXXXX")
printf '\nPreparing a private backup before installing the Phase 5 preview…\n'
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
WORK=$(mktemp -d "$APP/.local/phase5-download-XXXXXX")
trap 'rm -rf "$WORK"' EXIT
printf '\nDownloading the reviewed Phase 5 source snapshot…\n'
curl --fail --location --proto '=https' --tlsv1.2 -o "$WORK/source.zip" "https://github.com/Benzmaks/ai-influencer-studio/archive/$SOURCE_COMMIT.zip"
ditto -x -k "$WORK/source.zip" "$WORK"
NEW="$WORK/ai-influencer-studio-$SOURCE_COMMIT"
[ -f "$NEW/package.json" ] && [ -f "$NEW/prisma/migrations/202611020005_asset_history/migration.sql" ] || fail 'The source download is incomplete. The original source is still backed up.'
# No --delete: retain private environment, local assets and any user files.
rsync -a --exclude='.env' --exclude='.env.*' --exclude='.local' --exclude='.next' --exclude='node_modules' "$NEW/" "$APP/source/"
printf '\nPhase 5 preview installed. Your database and private login remain in place.\nA private backup is stored inside .local/backups. Never share that folder.\nThe existing starter will apply the additive migration and reopen your browser.\n'
# Install an official pinned Redis build without Docker or Homebrew.
if [ ! -x "$APP/.local/redis/bin/redis-server" ]; then
 if ! /usr/bin/xcode-select -p >/dev/null 2>&1; then
  /usr/bin/xcode-select --install || true
  fail 'Apple Command Line Tools are required to build local Redis. Finish the Apple installer, then run this updater again. Your private backups are retained.'
 fi
 curl --fail --location --proto '=https' --tlsv1.2 -o "$WORK/redis.tar.gz" 'https://github.com/redis/redis/archive/4b03ddfdac5a5c007358df8d08873f508f2fbfe3.tar.gz'
 printf '%s  %s\n' '0fd9c07c7cfdfb3359d434c8458911307898c6ff5615d06d4371099b7cecf51b' "$WORK/redis.tar.gz" | shasum -a 256 --check
 REDIS_BUILD=$(mktemp -d /tmp/studio-redis-build-XXXXXX)
 trap 'rm -rf "$WORK"; if [ -n "${REDIS_BUILD:-}" ]; then rm -rf "$REDIS_BUILD"; fi' EXIT
 tar -xzf "$WORK/redis.tar.gz" -C "$REDIS_BUILD"
 if ! make -C "$REDIS_BUILD/redis-4b03ddfdac5a5c007358df8d08873f508f2fbfe3" -j2 > "$APP/.local/redis-build.log" 2>&1; then
  tail -n 25 "$APP/.local/redis-build.log"
  fail 'Redis build stopped. Keep the backup and share this error text only.'
 fi
 mkdir -p "$APP/.local/redis/bin"
 cp "$REDIS_BUILD/redis-4b03ddfdac5a5c007358df8d08873f508f2fbfe3/src/redis-server" "$REDIS_BUILD/redis-4b03ddfdac5a5c007358df8d08873f508f2fbfe3/src/redis-cli" "$APP/.local/redis/bin/"
fi
[ -f "$APP/.local/redis-password" ] || openssl rand -hex 24 > "$APP/.local/redis-password"
mkdir -p "$APP/.local/redis-data"
REDIS_PASSWORD=$(tr -d '\r\n' < "$APP/.local/redis-password")
{
 printf 'bind 127.0.0.1\nprotected-mode yes\nport 56379\ndaemonize yes\nappendonly yes\n'
 printf 'dir "%s"\npidfile "%s"\nlogfile "%s"\nrequirepass %s\n' "$APP/.local/redis-data" "$APP/.local/redis.pid" "$APP/.local/redis.log" "$REDIS_PASSWORD"
} > "$APP/.local/redis.conf"
chmod 600 "$APP/.local/redis.conf" "$APP/.local/redis-password"
# Change only Redis configuration; preserve all database/login settings and user data.
export STUDIO_PRIVATE_REDIS_URL="redis://:$REDIS_PASSWORD@127.0.0.1:56379"
awk 'BEGIN{value=ENVIRON["STUDIO_PRIVATE_REDIS_URL"];found=0} /^REDIS_URL=/{print "REDIS_URL=" value;found=1;next} {print} END{if(!found)print "REDIS_URL=" value}' "$APP/source/.env" > "$WORK/private.env"
cp "$WORK/private.env" "$APP/source/.env"
chmod 600 "$APP/source/.env"
unset REDIS_PASSWORD STUDIO_PRIVATE_REDIS_URL
[ -f "$APP/.local/Start Foundation.command" ] || cp "$APP/Start Studio.command" "$APP/.local/Start Foundation.command"
[ -f "$APP/.local/Stop Foundation.command" ] || cp "$APP/Stop Studio.command" "$APP/.local/Stop Foundation.command"
# Foundation launchers are stored one directory below their original location.
# Normalize only the original exact cd line; this is safe on repeated updates.
for launcher in "$APP/.local/Start Foundation.command" "$APP/.local/Stop Foundation.command"; do
 sed -i '' 's|^cd "$(dirname "$0")"$|cd "$(dirname "$0")/.."|' "$launcher"
done
cp "$APP/source/tools/mac/Start Phase 4 services.command" "$APP/Start Studio.command"
cp "$APP/source/tools/mac/Stop Phase 4 services.command" "$APP/Stop Studio.command"
/bin/bash "$APP/Start Studio.command"
