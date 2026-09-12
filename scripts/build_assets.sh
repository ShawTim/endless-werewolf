#!/usr/bin/env bash
set -euo pipefail

# Regenerate the minified bundles served by docs/index.html.
#
# app.js and styles.css stay in the repo as the readable source of truth;
# these .min.* files are generated artifacts. Run this after ANY edit to a
# source file, then commit both. prepublish_check.sh fails if the committed
# artifacts do not match a fresh build, so they cannot silently go stale.
#
# esbuild is fetched via npx; no package.json is needed.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR/docs"

ESBUILD="npx --yes esbuild"

build_js() {
  # format=esm keeps the bare "three" specifiers intact for the import map.
  # Sourcemaps cost repo bytes but nothing on the wire (browsers only fetch a
  # map when devtools is open), and they keep production stack traces readable.
  $ESBUILD app.js \
    --minify \
    --format=esm \
    --target=es2020 \
    --charset=utf8 \
    --legal-comments=none \
    --sourcemap \
    --outfile=app.min.js \
    --log-level=warning
}

build_css() {
  $ESBUILD styles.css \
    --minify \
    --charset=utf8 \
    --legal-comments=none \
    --sourcemap \
    --outfile=styles.min.css \
    --log-level=warning
}

build_js
build_css

echo "Built docs/app.min.js and docs/styles.min.css"
