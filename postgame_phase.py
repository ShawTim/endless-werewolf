import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import state_manager

WORKSPACE = Path(__file__).resolve().parent
STATE_DIR = WORKSPACE / "data" / "state"
BRIDGE_AGENT_ID = "ai_werewolf_bridge"
FALLBACK_MODEL = "claude-sonnet-4-6"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _mood(status: str, executed: bool) -> str:
    if status == "winner" and executed:
        return "defiant"
    if status == "winner":
        return "relieved"
    if executed:
        return "frustrated"
    return "bitter"


def _call_bridge(payload: dict[str, Any]) -> dict[str, Any]:
    cmd = [
        "openclaw", "agent",
        "--agent", BRIDGE_AGENT_ID,
        "--message", json.dumps(payload, ensure_ascii=False),
        "--json",
    ]
    proc = subprocess.run(
        cmd,
        cwd=str(WORKSPACE),
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"bridge call failed: {proc.stderr.strip() or proc.stdout.strip()}")

    parsed = json.loads(proc.stdout)
    payloads = (((parsed or {}).get("result") or {}).get("payloads") or [])
    if not payloads:
        return {}

    text = (payloads[0].get("text") or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return {}
        return json.loads(text[start:end + 1])


def _get_quote(player_context: dict[str, Any], game_summary: dict[str, Any], model: str) -> str:
    """Call bridge agent to get an AI-generated postgame quote. Falls back to empty string on error."""
    try:
        result = _call_bridge({
            "request_type": "postgame_interview",
            "model": model,
            "player_context": player_context,
            "game_summary": game_summary,
        })
        return result.get("quote", "").strip()
    except Exception as e:
        print(f"[postgame] bridge call failed for {player_context.get('player_name')}: {e}", flush=True)
        return ""


def run_postgame_phase() -> dict[str, Any]:
    current = state_manager.ensure_current_game()
    game_id = current["game_id"]
    game_dir = current["game_dir"]

    night = _load_json(game_dir / "night_result.json")
    day = _load_json(game_dir / "day_result.json")
    resolve = _load_json(game_dir / "resolve_result.json")

    if not resolve:
        raise RuntimeError("resolve_result.json missing; run resolve phase first")

    players = night.get("players", {})
    final_roles = resolve.get("final_roles", {})
    executed_set = set(resolve.get("executed", []))
    winners = set(resolve.get("winners", []))

    # Build chat excerpt for context (last 20 lines)
    chat_history = day.get("chat_history", "")
    chat_lines = [ln for ln in chat_history.splitlines() if ln.strip()]
    chat_excerpt = "\n".join(chat_lines[-20:])

    game_summary = {
        "outcome": resolve.get("outcome", "unknown"),
        "winner_team": resolve.get("winner_team", "unknown"),
        "executed": resolve.get("executed", []),
        "chat_excerpt": chat_excerpt,
    }

    interviews: dict[str, list[dict[str, Any]]] = {
        "dead": [],
        "winners": [],
        "losers": [],
    }

    for name, role_payload in final_roles.items():
        executed = name in executed_set
        status = "winner" if name in winners else "loser"
        team = role_payload.get("team", "")
        role = role_payload.get("current_role", "")

        player_state = None
        for p in players.values():
            if p.get("name") == name:
                player_state = p
                break

        model = (player_state or {}).get("model", FALLBACK_MODEL)
        persona = (player_state or {}).get("persona", "")

        player_context = {
            "player_name": name,
            "persona": persona,
            "role": role,
            "team": team,
            "status": status,
            "executed": executed,
        }

        print(f"[postgame] interviewing {name} ({role}, {status})...", flush=True)
        quote = _get_quote(player_context, game_summary, model)

        row = {
            "player_name": name,
            "player_name_zh": (player_state or {}).get("name_zh", name),
            "player_name_en": (player_state or {}).get("name_en", name),
            "role": role,
            "team": team,
            "status": status,
            "executed": executed,
            "mood": _mood(status, executed),
            "quote": quote,
        }

        if executed:
            interviews["dead"].append(row)
        elif status == "winner":
            interviews["winners"].append(row)
        else:
            interviews["losers"].append(row)

    payload = {
        "status": "completed",
        "game_id": game_id,
        "generated_at": _utc_now(),
        "interviews": interviews,
    }

    _write_json(game_dir / "postgame_result.json", payload)
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    _write_json(STATE_DIR / "postgame_result.json", payload)

    state_manager.mark_phase(game_dir, "postgame", "postgame_result.json")
    return payload


if __name__ == "__main__":
    print(json.dumps(run_postgame_phase(), ensure_ascii=False, indent=2))
