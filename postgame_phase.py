import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import state_manager

WORKSPACE = Path(__file__).resolve().parent
STATE_DIR = WORKSPACE / "data" / "state"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _team_label(team: str) -> str:
    return {
        "werewolf_team": "Werewolf",
        "village_team": "Village",
        "tanner": "Tanner",
    }.get(team, team or "Unknown")


def _mood(status: str, executed: bool) -> str:
    if status == "winner" and executed:
        return "defiant"
    if status == "winner":
        return "relieved"
    if executed:
        return "frustrated"
    return "bitter"


def _build_quote(name: str, role: str, team: str, status: str, executed: bool, top_target: str | None) -> str:
    role_short = role.split(" (")[0] if role else "Unknown"
    team_short = _team_label(team)

    if status == "winner" and executed:
        return f"I went down, but the plan worked. As {role_short}, I pulled pressure where it needed to go." \
               f" If that's the cost of winning for {team_short}, I take it."
    if status == "winner":
        if top_target and top_target != name:
            return f"I stayed alive and rode the table momentum. Once pressure shifted to {top_target}, I knew {team_short} had the edge."
        return f"I kept my composure as {role_short} and let the table collapse into the lines I wanted. That's a clean {team_short} finish."
    if executed:
        return f"Getting executed as {role_short} hurts. I think the table overreacted and misread my signals in key turns."
    if top_target and top_target != name:
        return f"I lost this one as {role_short}. Too much table energy got absorbed by {top_target}, and my read couldn't recover."
    return f"I couldn't close it out as {role_short}. Next round I need cleaner timing and tighter claims."


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

    target_counts: dict[str, int] = {}
    for item in day.get("day_trace", []):
        if item.get("type") != "speech":
            continue
        tgt = item.get("target")
        if tgt:
            target_counts[tgt] = target_counts.get(tgt, 0) + 1

    top_target = None
    if target_counts:
        top_target = sorted(target_counts.items(), key=lambda x: x[1], reverse=True)[0][0]

    interviews = {
        "dead": [],
        "winners": [],
        "losers": [],
    }

    for name, payload in final_roles.items():
        executed = name in executed_set
        status = "winner" if name in winners else "loser"
        team = payload.get("team", "")
        role = payload.get("current_role", "")

        player_state = None
        for p in players.values():
            if p.get("name") == name:
                player_state = p
                break

        quote = _build_quote(name, role, team, status, executed, top_target)
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
