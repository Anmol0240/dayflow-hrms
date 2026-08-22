#!/usr/bin/env sh
set -eu

python -m pytest backend/tests
pnpm --dir frontend run test
pnpm --dir frontend run test:e2e
