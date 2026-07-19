#!/usr/bin/env python3
"""Verify that the live GitHub Pages archive matches local published bytes."""

import argparse
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS_ROOT = ROOT / "docs"
DEFAULT_BASE_URL = "https://shawt.im/endless-werewolf/"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str, timeout: float, attempts: int) -> bytes:
    last_error: Exception | None = None
    for attempt in range(attempts):
        separator = "&" if "?" in url else "?"
        nonce = f"{time.time_ns()}-{attempt}"
        request = urllib.request.Request(
            f"{url}{separator}verify={nonce}",
            headers={
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "User-Agent": "Endless-Werewolf-Live-Verifier/1.0",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}")
                return response.read()
        except (OSError, RuntimeError, urllib.error.URLError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(1 + attempt)
    raise RuntimeError(f"failed after {attempts} attempts: {last_error}")


def published_paths() -> list[Path]:
    paths = [
        DOCS_ROOT / "index.html",
        DOCS_ROOT / "app.js",
        DOCS_ROOT / "data" / "index.json",
    ]
    paths.extend(
        sorted(path for path in (DOCS_ROOT / "data" / "games").rglob("*") if path.is_file())
    )
    return paths


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--attempts", type=int, default=3)
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/") + "/"
    mismatches = []
    checked_bytes = 0
    paths = published_paths()

    for local_path in paths:
        relative = local_path.relative_to(DOCS_ROOT).as_posix()
        url = urllib.parse.urljoin(base_url, urllib.parse.quote(relative))
        local_bytes = local_path.read_bytes()
        try:
            live_bytes = fetch(url, args.timeout, args.attempts)
        except Exception as exc:
            mismatches.append({"path": relative, "error": str(exc)})
            continue

        checked_bytes += len(local_bytes)
        if live_bytes != local_bytes:
            mismatches.append({
                "path": relative,
                "local_size": len(local_bytes),
                "live_size": len(live_bytes),
                "local_sha256": sha256(local_bytes),
                "live_sha256": sha256(live_bytes),
            })

    result = {
        "base_url": base_url,
        "files_checked": len(paths),
        "local_bytes_checked": checked_bytes,
        "mismatches": mismatches,
        "status": "pass" if not mismatches else "fail",
    }
    print(json.dumps(result, indent=2))
    return 0 if not mismatches else 1


if __name__ == "__main__":
    raise SystemExit(main())
