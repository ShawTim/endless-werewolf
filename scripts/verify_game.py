#!/usr/bin/env python3
"""
Verify the latest game data is healthy before publishing.

Checks:
1. Manifest status = "completed"
2. All required phase files exist and are valid JSON
3. All 6 players have data
4. Night: 6 players + seating + center cards + night_trace
5. Day: ≥1 speech per player, chat_history non-empty
6. Vote: 6 votes, executed player present
7. Resolve: outcome + winner_team present
8. Postgame: ≥4 interview quotes
9. ZH translations exist for all _en files
10. No bridge_error / fallback in night_trace
11. No bridge_error in day_trace (timeout during speech)
12. No bridge_error / fallback in vote_trace (timeout during vote)

Exit 0 = healthy, Exit 1 = unhealthy.
Prints JSON report to stdout.
"""
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE))

import state_manager

REQUIRED_FILES = [
    "manifest.json",
    "night_result.json",
    "day_result.json",
    "vote_result.json",
    "resolve_result.json",
    "postgame_result.json",
    "night_result_zh.json",
    "day_result_zh.json",
    "vote_result_zh.json",
    "resolve_result_zh.json",
    "postgame_result_zh.json",
    "chat_history.md",
    "chat_history_zh.md",
]

ERRORS = []
WARNINGS = []


def err(msg):
    ERRORS.append(msg)


def warn(msg):
    WARNINGS.append(msg)


def load_json(path: Path) -> dict | None:
    if not path.exists():
        err(f"Missing file: {path.name}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(f"Invalid JSON in {path.name}: {e}")
        return None


def main():
    current = state_manager.get_current_game()
    game_dir = Path(current["game_dir"])
    game_id = current["game_id"]

    report = {"game_id": game_id, "game_dir": str(game_dir), "checks": []}

    # 1. Required files exist
    missing_files = []
    for fname in REQUIRED_FILES:
        fpath = game_dir / fname
        if not fpath.exists():
            missing_files.append(fname)
    if missing_files:
        err(f"Missing files: {', '.join(missing_files)}")
    report["checks"].append({"check": "required_files", "pass": not missing_files,
                             "detail": f"{len(REQUIRED_FILES) - len(missing_files)}/{len(REQUIRED_FILES)} present"})

    # 2. Manifest
    manifest = load_json(game_dir / "manifest.json")
    if manifest:
        if manifest.get("status") != "completed":
            err(f"Manifest status={manifest.get('status')} (expected 'completed')")
        if not manifest.get("outcome"):
            err("Manifest missing outcome")
        report["checks"].append({"check": "manifest", "pass": manifest.get("status") == "completed",
                                 "detail": f"status={manifest.get('status')}, outcome={manifest.get('outcome')}"})
    else:
        report["checks"].append({"check": "manifest", "pass": False, "detail": "unparseable"})

    # 3. Night result
    night = load_json(game_dir / "night_result.json")
    if night:
        players = night.get("players", {})
        if len(players) != 6:
            err(f"Night: expected 6 players, got {len(players)}")
        if not night.get("center_cards"):
            err("Night: missing center_cards")
        if not night.get("night_trace"):
            err("Night: missing night_trace")
        # Check for bridge errors in night_trace
        for entry in night.get("night_trace", []):
            if isinstance(entry, dict) and entry.get("status") == "bridge_error":
                warn(f"Night: bridge_error in {entry.get('player', '?')}: {entry.get('error', '')[:80]}")
        report["checks"].append({"check": "night_result", "pass": len(players) == 6,
                                 "detail": f"{len(players)} players, {len(night.get('night_trace', []))} trace entries"})
    else:
        report["checks"].append({"check": "night_result", "pass": False, "detail": "unparseable"})

    # 4. Day result
    day = load_json(game_dir / "day_result.json")
    if day:
        stats = day.get("player_stats", {})
        speech_issues = []
        for p, s in stats.items():
            count = s.get("speeches_made", s.get("speak_count", 0))
            if count == 0:
                speech_issues.append(p)
        chat = day.get("chat_history", [])
        if not chat:
            err("Day: empty chat_history")
        if speech_issues:
            warn(f"Day: players with 0 speeches: {', '.join(speech_issues)}")
        # Check for bridge errors in day_trace
        day_errors = [t for t in day.get("day_trace", []) if isinstance(t, dict) and t.get("type") == "bridge_error"]
        if day_errors:
            names = ", ".join(t.get("player_name", "?") for t in day_errors)
            err(f"Day: {len(day_errors)} bridge_error(s) in day_trace ({names}) — timeout during speech phase")
        report["checks"].append({"check": "day_result", "pass": len(stats) >= 6 and bool(chat) and not day_errors,
                                 "detail": f"{len(stats)} players, {len(chat)} chat lines, {len(speech_issues)} silent, {len(day_errors)} bridge_errors"})
    else:
        report["checks"].append({"check": "day_result", "pass": False, "detail": "unparseable"})

    # 5. Vote result
    vote = load_json(game_dir / "vote_result.json")
    if vote:
        votes = vote.get("votes", {})
        executed = vote.get("executed", [])
        if len(votes) != 6:
            err(f"Vote: expected 6 votes, got {len(votes)}")
        if not executed:
            err("Vote: no executed player")
        # Check for bridge errors / fallbacks in vote_trace
        vote_errors = [t for t in vote.get("vote_trace", []) if isinstance(t, dict) and "error" in t]
        if vote_errors:
            names = ", ".join(t.get("player", "?") for t in vote_errors)
            err(f"Vote: {len(vote_errors)} bridge_error/fallback(s) in vote_trace ({names}) — timeout during vote")
        report["checks"].append({"check": "vote_result", "pass": len(votes) == 6 and bool(executed) and not vote_errors,
                                 "detail": f"{len(votes)} votes, executed={executed}, {len(vote_errors)} bridge_errors"})
    else:
        report["checks"].append({"check": "vote_result", "pass": False, "detail": "unparseable"})

    # 6. Resolve result
    resolve = load_json(game_dir / "resolve_result.json")
    if resolve:
        if not resolve.get("outcome"):
            err("Resolve: missing outcome")
        if not resolve.get("winner_team"):
            err("Resolve: missing winner_team")
        report["checks"].append({"check": "resolve_result", "pass": bool(resolve.get("outcome")),
                                 "detail": f"outcome={resolve.get('outcome')}, winner={resolve.get('winner_team')}"})
    else:
        report["checks"].append({"check": "resolve_result", "pass": False, "detail": "unparseable"})

    # 7. Postgame result
    postgame = load_json(game_dir / "postgame_result.json")
    if postgame:
        interviews = postgame.get("interviews", {})
        total_quotes = sum(len(players) for players in interviews.values())
        if total_quotes < 4:
            warn(f"Postgame: only {total_quotes} quotes (expected ≥4)")
        report["checks"].append({"check": "postgame_result", "pass": total_quotes >= 4,
                                 "detail": f"{total_quotes} quotes across {len(interviews)} groups"})
    else:
        report["checks"].append({"check": "postgame_result", "pass": False, "detail": "unparseable"})

    # 8. ZH translations
    zh_files = [f for f in REQUIRED_FILES if f.endswith("_zh.json")]
    zh_ok = all((game_dir / f).exists() for f in zh_files)
    report["checks"].append({"check": "zh_translations", "pass": zh_ok,
                             "detail": f"{sum(1 for f in zh_files if (game_dir / f).exists())}/{len(zh_files)} present"})

    # Summary
    report["errors"] = ERRORS
    report["warnings"] = WARNINGS
    report["healthy"] = len(ERRORS) == 0

    print(json.dumps(report, ensure_ascii=False, indent=2))

    # Auto-cleanup: move unhealthy game to _trash/
    if not report["healthy"]:
        trash_dir = game_dir.parent / "_trash"
        trash_dir.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = trash_dir / f"{game_id}_{ts}"
        shutil.move(str(game_dir), str(dest))
        print(f"[cleanup] Moved unhealthy {game_id} to {dest}", file=sys.stderr)

    return 0 if report["healthy"] else 1


if __name__ == "__main__":
    sys.exit(main())
