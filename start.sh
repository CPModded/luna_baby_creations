#!/bin/sh
set -eu
cd "$(dirname "$0")"
export PORT="${SERVER_PORT:-${PORT:-3000}}"
exec npm start
