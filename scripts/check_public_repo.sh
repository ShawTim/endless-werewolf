#!/usr/bin/env bash
set -euo pipefail

allow_patterns=(
  ".gitignore"
  "README.md"
  "RULES.md"
  "bridge_agent.py"
  "day_phase.py"
  "gm_night.py"
  "night_phase.py"
  "resolve_phase.py"
  "run_full_game.py"
  "state_manager.py"
  "data/current_game.json"
  "data/game_counter.json"
  "data/players.json"
  "data/roles_pool.json"
  "data/games/"
  "docs/"
  "scripts/build_pages.py"
  "scripts/publish_pages.sh"
  "scripts/check_public_repo.sh"
)

is_allowed() {
  local f="$1"
  for p in "${allow_patterns[@]}"; do
    if [[ "$f" == "$p" || "$f" == "$p"* ]]; then
      return 0
    fi
  done
  return 1
}

bad=0
while IFS= read -r f; do
  if ! is_allowed "$f"; then
    echo "[BLOCK] non-public-safe tracked file: $f"
    bad=1
  fi
done < <(git ls-files)

if [[ $bad -ne 0 ]]; then
  echo "Public check failed."
  exit 1
fi

echo "Public check passed."
