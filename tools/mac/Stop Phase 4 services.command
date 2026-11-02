#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
APP="$PWD"
LOCAL="$APP/.local"
SOURCE="$APP/source"
if [ -f "$LOCAL/worker.pid" ]; then
 pid=$(cat "$LOCAL/worker.pid")
 case "$pid" in *[!0-9]*|'') ;; *)
 command=$(ps -p "$pid" -o command= 2>/dev/null || true)
 cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1 || true)
 if [ "$cwd" = "$SOURCE" ] && [[ "$command" == *workers/run.ts* ]]; then
  kill -TERM "$pid" 2>/dev/null || true
  for attempt in $(seq 1 15); do if ! kill -0 "$pid" 2>/dev/null; then break; fi; sleep 1; done
  if kill -0 "$pid" 2>/dev/null; then kill -KILL "$pid" 2>/dev/null || true; fi
 fi;; esac
fi
if [ -x "$LOCAL/redis/bin/redis-cli" ] && [ -f "$LOCAL/redis-password" ]; then
 export REDISCLI_AUTH="$(tr -d '\r\n' < "$LOCAL/redis-password")"
 "$LOCAL/redis/bin/redis-cli" -h 127.0.0.1 -p 56379 shutdown save >/dev/null 2>&1 || true
 unset REDISCLI_AUTH
fi
/bin/bash "$LOCAL/Stop Foundation.command"
