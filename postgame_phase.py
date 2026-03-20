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


def _team_label_zh(team: str) -> str:
    return {
        "werewolf_team": "狼人陣營",
        "village_team": "村民陣營",
        "tanner": "製皮者",
    }.get(team, team or "未知")


def _mood(status: str, executed: bool) -> str:
    if status == "winner" and executed:
        return "defiant"
    if status == "winner":
        return "relieved"
    if executed:
        return "frustrated"
    return "bitter"


def _build_quote(name: str, role: str, team: str, status: str, executed: bool, top_target: str | None, top_target_zh: str | None = None) -> str:
    role_zh = role.split("(")[1].rstrip(")") if "(" in role else role
    team_zh = _team_label_zh(team)
    target_zh = top_target_zh or top_target

    if status == "winner" and executed:
        return f"我雖然畀人殺死，但計劃係成功咗嘅。作為{role_zh}，我將壓力引去需要去嘅地方。呢就係{team_zh}嬴嘅代價，認喇。"
    if status == "winner":
        if target_zh and top_target != name:
            return f"我捱到最後，借住咗枱面嘅氣勢。壓力轉移到{target_zh}之後，我就知道{team_zh}已經佔優喇。"
        return f"我以{role_zh}嘅身份保持冷靜，讓枱面按我想要嘅方向崩潰。{team_zh}完美收局。"
    if executed:
        return f"作為{role_zh}畀人投出去真係好唔好受。我覺得枱面反應過度，幾個關鍵回合錯讀咗我嘅信號。"
    if target_zh and top_target != name:
        return f"我以{role_zh}輸咗呢局。太多枱面能量都畀{target_zh}吸走，我嘅判斷冇辦法追返嚟。"
    return f"我冇辦法以{role_zh}鎖定勝局。下一局要時機更準，聲稱更清晰。"


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
    top_target_zh = None
    if target_counts:
        top_target = sorted(target_counts.items(), key=lambda x: x[1], reverse=True)[0][0]
        for p in players.values():
            if p.get("name") == top_target:
                top_target_zh = p.get("name_zh") or top_target
                break

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

        quote = _build_quote(name, role, team, status, executed, top_target, top_target_zh)
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
