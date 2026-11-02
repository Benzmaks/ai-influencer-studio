#!/bin/bash
set -euo pipefail
# Installed beside Start Studio.command by the private Phase 4 updater.
cd "$(dirname "$0")"
APP="$PWD"
LOCAL="$APP/.local"
SOURCE="$APP/source"
RUNTIME="$LOCAL/node-v22.23.4-darwin-x64"
export PATH="$RUNTIME/bin:$PATH"
umask 077
fail(){ printf '\n%s\nPress Return to close. ' "$1"; read -r unused || true; exit 1; }
[ -x "$LOCAL/redis/bin/redis-server" ] || fail 'Redis is missing. Run the Phase 4 preview updater first.'
[ -f "$LOCAL/redis-password" ] || fail 'Private Redis configuration is missing. Run the Phase 4 updater.'
export REDISCLI_AUTH="$(tr -d '\r\n' < "$LOCAL/redis-password")"
if ! "$LOCAL/redis/bin/redis-cli" -h 127.0.0.1 -p 56379 ping >/dev/null 2>&1; then
 if lsof -tiTCP:56379 -sTCP:LISTEN >/dev/null 2>&1; then fail 'Another service uses port 56379. Stop it before starting this Studio.'; fi
 "$LOCAL/redis/bin/redis-server" "$LOCAL/redis.conf"
fi
unset REDISCLI_AUTH
/bin/bash "$LOCAL/Start Foundation.command"
cd "$SOURCE"
RUNNING=false
if [ -f "$LOCAL/worker.pid" ]; then
 pid=$(cat "$LOCAL/worker.pid")
 case "$pid" in *[!0-9]*|'') ;; *)
 command=$(ps -p "$pid" -o command= 2>/dev/null || true)
 cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1 || true)
 if [ "$cwd" = "$SOURCE" ] && [[ "$command" == *workers/run.ts* ]]; then RUNNING=true; fi;; esac
fi
if [ "$RUNNING" = false ]; then
 nohup "$RUNTIME/bin/node" --import tsx workers/run.ts > "$LOCAL/worker.log" 2>&1 < /dev/null &
 printf '%s\n' "$!" > "$LOCAL/worker.pid"
fi
sleep 1
kill -0 "$(cat "$LOCAL/worker.pid")" 2>/dev/null || fail 'The image worker stopped. Read .local/worker.log and share only its error message.'
printf '\nImage/video worker and private Redis are ready. Open Images or Videos for clearly labeled mock previews. No paid AI keys are required.\n'
