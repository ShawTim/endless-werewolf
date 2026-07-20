#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "=== Language regression tests ==="
python3 scripts/test_language_audit.py

echo "=== Full source/public archive audit ==="
python3 scripts/audit_all_games.py

echo "=== Syntax and public-safety checks ==="
python3 -m py_compile \
  state_manager.py \
  translate_zh_phase.py \
  scripts/audit_all_games.py \
  scripts/build_pages.py \
  scripts/repair_language_data.py \
  scripts/test_language_audit.py \
  scripts/verify_game.py \
  scripts/verify_live_archive.py
node --check docs/app.js
bash -n scripts/*.sh
bash scripts/check_public_repo.sh
test -f docs/.nojekyll

echo "Pre-publish checks passed."
