import json
from pathlib import Path
from typing import Any

import state_manager

WORKSPACE = Path(__file__).resolve().parent
STATE_DIR = WORKSPACE / "data" / "state"
NIGHT_RESULT_PATH = STATE_DIR / "night_result.json"
VOTE_RESULT_PATH = STATE_DIR / "vote_result.json"
RESOLVE_RESULT_PATH = STATE_DIR / "resolve_result.json"


def role_key(role_text: str) -> str:
    if not role_text:
        return ""
    return role_text.split(" (")[0].strip()


def is_werewolf(role_text: str) -> bool:
    return role_key(role_text) == "Werewolf"


def is_tanner(role_text: str) -> bool:
    return role_key(role_text) == "Tanner"


def team_of(role_text: str) -> str:
    k = role_key(role_text)
    if k in {"Werewolf", "Minion"}:
        return "werewolf_team"
    if k == "Tanner":
        return "tanner"
    return "village_team"


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(str(path))
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_game(night: dict[str, Any], vote: dict[str, Any]) -> dict[str, Any]:
    players = list(night["players"].values())
    by_name = {p["name"]: p for p in players}
    executed = vote.get("executed", [])

    executed_tanners = [name for name in executed if is_tanner(by_name.get(name, {}).get("current_role", ""))]
    werewolves_in_play = [p["name"] for p in players if is_werewolf(p.get("current_role", ""))]
    executed_werewolves = [name for name in executed if name in werewolves_in_play]

    if executed_tanners:
        outcome = "tanner_win"
        winner_team = "tanner"
        winners = executed_tanners
        reason = "Tanner was executed."
    elif werewolves_in_play:
        if executed_werewolves:
            outcome = "village_win"
            winner_team = "village_team"
            winners = [p["name"] for p in players if team_of(p.get("current_role", "")) == "village_team"]
            reason = "At least one werewolf was executed."
        else:
            outcome = "werewolf_win"
            winner_team = "werewolf_team"
            winners = [p["name"] for p in players if team_of(p.get("current_role", "")) == "werewolf_team"]
            reason = "No werewolf was executed."
    else:
        if len(executed) == 0:
            outcome = "village_win_no_wolf"
            winner_team = "village_team"
            winners = [p["name"] for p in players if team_of(p.get("current_role", "")) == "village_team"]
            reason = "No werewolf in play and nobody was executed."
        else:
            outcome = "no_team_win"
            winner_team = "none"
            winners = []
            reason = "No werewolf in play, but someone was executed."

    final_roles = {
        p["name"]: {
            "initial_role": p.get("initial_role"),
            "current_role": p.get("current_role"),
            "team": team_of(p.get("current_role", "")),
        }
        for p in players
    }

    return {
        "status": "completed",
        "outcome": outcome,
        "winner_team": winner_team,
        "winners": winners,
        "reason": reason,
        "executed": executed,
        "werewolves_in_play": werewolves_in_play,
        "executed_werewolves": executed_werewolves,
        "votes": vote.get("votes", {}),
        "tally": vote.get("tally", {}),
        "final_roles": final_roles,
    }


def run_resolve_phase() -> dict[str, Any]:
    current = state_manager.ensure_current_game()
    game_dir = current["game_dir"]

    night_path = game_dir / "night_result.json"
    vote_path = game_dir / "vote_result.json"
    if not night_path.exists():
        night_path = NIGHT_RESULT_PATH
    if not vote_path.exists():
        vote_path = VOTE_RESULT_PATH

    night = load_json(night_path)
    vote = load_json(vote_path)
    result = resolve_game(night, vote)
    result["game_id"] = current["game_id"]

    # write both game-scoped and legacy single-slot
    (game_dir / "resolve_result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    RESOLVE_RESULT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    state_manager.mark_phase(game_dir, "resolve", "resolve_result.json")
    state_manager.mark_completed(game_dir, outcome=result.get("outcome"))

    return result


if __name__ == "__main__":
    result = run_resolve_phase()
    print(json.dumps(result, ensure_ascii=False, indent=2))
