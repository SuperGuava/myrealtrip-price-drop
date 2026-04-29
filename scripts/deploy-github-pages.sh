#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-https://github.com/SuperGuava/myrealtrip-price-drop.git}"
WORK="${TMPDIR:-/tmp}/myrealtrip-price-drop-deploy"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "$WORK"
mkdir -p "$WORK"
rsync -a --delete \
  --exclude '.git' \
  --exclude '.github' \
  "$SRC/" "$WORK/"

cd "$WORK"
git init -q -b main
git config user.name "mango-bot"
git config user.email "mango-bot@users.noreply.github.com"
git remote add origin "$REPO"
git add .
git commit -q -m "Update lowprice.kr landing data"
git push -u origin main --force
