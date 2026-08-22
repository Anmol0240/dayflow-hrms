#!/usr/bin/env sh
set -eu

python -m pip install -e "./backend[dev]"
corepack enable
pnpm --dir frontend install --frozen-lockfile
