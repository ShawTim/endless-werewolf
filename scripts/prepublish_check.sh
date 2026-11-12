#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "=== Language regression tests ==="
python3 scripts/test_language_audit.py

echo "=== Day-debate schema tests ==="
python3 scripts/test_debate_schema.py

echo "=== Full source/public archive audit ==="
python3 scripts/audit_all_games.py

echo "=== Syntax and public-safety checks ==="
python3 -m py_compile \
  state_manager.py \
  bridge_agent.py \
  day_phase.py \
  tag_phase.py \
  translate_zh_phase.py \
  scripts/audit_all_games.py \
  scripts/build_pages.py \
  scripts/repair_language_data.py \
  scripts/test_language_audit.py \
  scripts/test_debate_schema.py \
  scripts/verify_game.py \
  scripts/verify_live_archive.py
node --check docs/app.js
node --check docs/app.min.js
bash -n scripts/*.sh
bash scripts/check_public_repo.sh
test -f docs/.nojekyll

# The minified bundles under docs/ are generated artifacts committed alongside
# their sources. Rebuild into a temp dir and fail if the committed copies no
# longer match, so editing app.js/styles.css without re-running
# scripts/build_assets.sh can never silently ship stale markup.
echo "=== Minified bundle freshness ==="
FRESH_TMP="$(mktemp -d)"
trap 'rm -rf "$FRESH_TMP"' EXIT
# Flags must match scripts/build_assets.sh exactly, or the comparison reports
# a false mismatch.
npx --yes esbuild docs/app.js --minify --format=esm --target=es2020 \
  --charset=utf8 --legal-comments=none --sourcemap \
  --outfile="$FRESH_TMP/app.min.js" --log-level=warning
npx --yes esbuild docs/styles.css --minify --charset=utf8 \
  --legal-comments=none --sourcemap \
  --outfile="$FRESH_TMP/styles.min.css" --log-level=warning
if ! cmp -s "$FRESH_TMP/app.min.js" docs/app.min.js; then
  echo "[STALE] docs/app.min.js does not match a fresh build of docs/app.js."
  echo "        Run: bash scripts/build_assets.sh"
  exit 1
fi
if ! cmp -s "$FRESH_TMP/styles.min.css" docs/styles.min.css; then
  echo "[STALE] docs/styles.min.css does not match a fresh build of docs/styles.css."
  echo "        Run: bash scripts/build_assets.sh"
  exit 1
fi

echo "Pre-publish checks passed."
