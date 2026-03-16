#!/usr/bin/env bash
# start.sh — start static server (port 8000) and proxy (port 3000) if not already running

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATIC_PORT=8000
PROXY_PORT=3000

function is_listening() {
  local port=$1
  ss -ltn "sport = :$port" | tail -n +2 | grep -q LISTEN || return 1
}

pushd "$ROOT_DIR" >/dev/null

if is_listening "$STATIC_PORT"; then
  echo "Static server already listening on port $STATIC_PORT"
else
  echo "Starting static server on port $STATIC_PORT"
  nohup python3 -m http.server "$STATIC_PORT" > static_server.log 2>&1 &
  sleep 0.3
fi

if is_listening "$PROXY_PORT"; then
  echo "Proxy already listening on port $PROXY_PORT"
else
  echo "Starting proxy on port $PROXY_PORT"
  # Use existing environment variable if set
  nohup env RESUMEIQ_API_KEY="${RESUMEIQ_API_KEY-}" node server.js > proxy.log 2>&1 &
  sleep 0.3
fi

echo "Done. Open http://localhost:$STATIC_PORT"
popd >/dev/null
