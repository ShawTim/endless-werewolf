import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WORKSPACE = Path(__file__).resolve().parent
DATA_DIR = WORKSPACE / "data"
STATE_DIR = DATA_DIR / "state"
GAMES_DIR = DATA_DIR / "games"
COUNTER_PATH = DATA_DIR / "game_counter.json"
CURRENT_PATH = DATA_DIR / "current_game.json"
LEGACY_CHAT_LOG = WORKSPACE / "logs" / "chat_history.md"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _next_game_id() -> str:
    payload = _read_json(COUNTER_PATH, {"last": 0})
    last = int(payload.get("last", 0)) + 1
    _write_json(COUNTER_PATH, {"last": last, "updated_at": _utc_now()})
    return f"game_{last:06d}"


def start_new_game() -> dict[str, Any]:
    game_id = _next_game_id()
    game_dir = GAMES_DIR / game_id
    game_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "game_id": game_id,
        "status": "running",
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
        "phases": {},
    }
    _write_json(game_dir / "manifest.json", manifest)
    _write_json(CURRENT_PATH, {
        "game_id": game_id,
        "game_dir": str(game_dir),
        "status": "running",
        "updated_at": _utc_now(),
    })
    return {"game_id": game_id, "game_dir": game_dir, "manifest": manifest}


def get_current_game() -> dict[str, Any] | None:
    payload = _read_json(CURRENT_PATH)
    if not payload:
        return None
    game_dir = Path(payload.get("game_dir", ""))
    if not game_dir.exists():
        return None
    return {"game_id": payload.get("game_id"), "game_dir": game_dir}


def _update_manifest(game_dir: Path, patch: dict[str, Any]) -> dict[str, Any]:
    manifest_path = game_dir / "manifest.json"
    manifest = _read_json(manifest_path, {
        "game_id": game_dir.name,
        "status": "running",
        "created_at": _utc_now(),
        "phases": {},
    })
    manifest.update(patch)
    manifest["updated_at"] = _utc_now()
    _write_json(manifest_path, manifest)
    return manifest


def mark_phase(game_dir: Path, phase: str, file_name: str) -> None:
    manifest = _read_json(game_dir / "manifest.json", {
        "game_id": game_dir.name,
        "status": "running",
        "created_at": _utc_now(),
        "phases": {},
    })
    phases = manifest.setdefault("phases", {})
    phases[phase] = {
        "file": file_name,
        "updated_at": _utc_now(),
    }
    manifest["updated_at"] = _utc_now()
    _write_json(game_dir / "manifest.json", manifest)


def mark_completed(game_dir: Path, outcome: str | None = None) -> None:
    patch = {"status": "completed", "completed_at": _utc_now()}
    if outcome:
        patch["outcome"] = outcome
    _update_manifest(game_dir, patch)

    current = _read_json(CURRENT_PATH)
    if current and current.get("game_dir") == str(game_dir):
        current["status"] = "completed"
        current["updated_at"] = _utc_now()
        _write_json(CURRENT_PATH, current)


def ensure_current_game() -> dict[str, Any]:
    current = get_current_game()
    if current:
        return current

    # bootstrap from legacy single-slot files if present
    legacy_night = STATE_DIR / "night_result.json"
    if legacy_night.exists():
        started = start_new_game()
        game_dir = started["game_dir"]
        for name in [
            "night_plan.json",
            "night_partial_state.json",
            "night_result.json",
            "day_result.json",
            "vote_result.json",
            "resolve_result.json",
            "player_1.json",
            "player_2.json",
            "player_3.json",
            "player_4.json",
            "player_5.json",
            "player_6.json",
            "day_config.json",
        ]:
            src = STATE_DIR / name
            if src.exists():
                shutil.copy2(src, game_dir / name)
        if LEGACY_CHAT_LOG.exists():
            shutil.copy2(LEGACY_CHAT_LOG, game_dir / "chat_history.md")
        return {"game_id": started["game_id"], "game_dir": game_dir}

    # if nothing exists, create a fresh game slot
    started = start_new_game()
    return {"game_id": started["game_id"], "game_dir": started["game_dir"]}
