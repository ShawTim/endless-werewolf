#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
DATA_GAMES = WORKSPACE / "data" / "games"
DOCS = WORKSPACE / "docs"
DOCS_DATA = DOCS / "data"
DOCS_GAMES = DOCS_DATA / "games"
INDEX_PATH = DOCS_DATA / "index.json"

FILES_TO_COPY = [
    "manifest.json",
    "night_result.json",
    "day_result.json",
    "vote_result.json",
    "resolve_result.json",
    "postgame_result.json",
    "chat_history.md",
    "night_result_en.json",
    "day_result_en.json",
    "vote_result_en.json",
    "resolve_result_en.json",
    "postgame_result_en.json",
    "chat_history_en.md",
]


def read_json(path: Path, default=None):
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def ensure_dirs():
    DOCS.mkdir(parents=True, exist_ok=True)
    DOCS_DATA.mkdir(parents=True, exist_ok=True)
    DOCS_GAMES.mkdir(parents=True, exist_ok=True)


def copy_game_dir(src_game_dir: Path, dst_game_dir: Path):
    dst_game_dir.mkdir(parents=True, exist_ok=True)
    for name in FILES_TO_COPY:
        src = src_game_dir / name
        if src.exists():
            shutil.copy2(src, dst_game_dir / name)


def build_summary(game_dir: Path) -> dict:
    manifest = read_json(game_dir / "manifest.json", {})
    resolve_result = read_json(game_dir / "resolve_result.json", {})
    vote_result = read_json(game_dir / "vote_result.json", {})
    day_result = read_json(game_dir / "day_result.json", {})

    votes = vote_result.get("votes", {})
    chat_history = day_result.get("chat_history", "")
    lines = [ln for ln in chat_history.splitlines() if ln.strip()]

    return {
        "game_id": game_dir.name,
        "status": manifest.get("status", "unknown"),
        "created_at": manifest.get("created_at"),
        "completed_at": manifest.get("completed_at"),
        "outcome": resolve_result.get("outcome"),
        "winner_team": resolve_result.get("winner_team"),
        "executed": resolve_result.get("executed", []),
        "winners": resolve_result.get("winners", []),
        "votes_count": len(votes),
        "chat_lines": len(lines),
    }


def build_index():
    ensure_dirs()
    summaries = []

    if not DATA_GAMES.exists():
        INDEX_PATH.write_text(json.dumps({"games": []}, ensure_ascii=False, indent=2), encoding="utf-8")
        return

    for game_dir in sorted(DATA_GAMES.glob("game_*")):
        manifest = read_json(game_dir / "manifest.json", {})
        if manifest.get("status") != "completed":
            continue

        copy_game_dir(game_dir, DOCS_GAMES / game_dir.name)
        summaries.append(build_summary(game_dir))

    summaries.sort(key=lambda x: x["game_id"], reverse=True)
    payload = {
        "schema_version": 1,
        "games": summaries,
    }
    INDEX_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    build_index()
    print(f"Built pages index: {INDEX_PATH}")


if __name__ == "__main__":
    main()
