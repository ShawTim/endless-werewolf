#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/publish_pages.sh
# Optional env:
#   BATCH_LABEL="games-001-020"

cd "$(dirname "$0")/.."

python3 scripts/build_pages.py

# Commit only when there are changes
if git diff --quiet -- docs data/games data/current_game.json data/game_counter.json; then
  echo "No changes to publish."
  exit 0
fi

LABEL=${BATCH_LABEL:-"auto"}
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

git add docs data/games data/current_game.json data/game_counter.json

git commit -m "chore(pages): publish werewolf archive (${LABEL}) @ ${TS}"
git push

echo "Published GitHub Pages content."