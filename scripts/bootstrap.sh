#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm run env:init
npm run db:generate
# Start PostgreSQL/Redis first; this script does not reset data or overwrite .env.
npm run db:migrate
npm run db:seed
npm run health
