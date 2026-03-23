#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/publish_pages.sh
# Optional env:
#   BATCH_LABEL="games-001-020"

# Always run from repo root (caller cwd may vary)
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# Commit only when there are changes (staged, unstaged, or untracked)
if [ -z "$(git status --porcelain -- docs data/games data/current_game.json data/game_counter.json)" ]; then
  echo "No changes to publish."
  exit 0
fi

LABEL=${BATCH_LABEL:-"auto"}
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# -A is required to include newly created game directories/files
# (plain `git add data/games` can miss untracked nested paths in this flow)
git add -A docs data/games data/current_game.json data/game_counter.json

git commit -m "chore(pages): publish werewolf archive (${LABEL}) @ ${TS}"
git push

echo "Published GitHub Pages content."
