#!/usr/bin/env bash
set -euo pipefail

cd /home/openclaw/.openclaw/workspaces/ai-werewolf

# 1) Start a fresh game, auto-decide night actions deterministically, finalize night.
python3 - <<'PY'
import json, subprocess
from pathlib import Path
import gm_night

WORKSPACE = Path(__file__).resolve().parent.parent

prepared = gm_night.prepare_run(start_new_game=True)
game_dir = Path(prepared["game_dir"])
plan = prepared["plan"]
partial = prepared["partial_state"]

def call_bridge_for_night(step: dict) -> dict:
    """Ask bridge agent to decide a player's night action."""
    dr = step["decision_request"]
    payload = {
        "request_type": "night_action",
        "model": dr.get("model", ""),
        "player_context": {
            "player_name": dr["player_name"],
            "persona": dr.get("persona", ""),
        },
        "decision_request": dr,
    }
    proc = subprocess.run(
        ["openclaw", "agent", "--agent", "ai_werewolf_bridge",
         "--message", json.dumps(payload, ensure_ascii=False), "--json"],
        cwd=str(WORKSPACE),
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"bridge failed for {dr['player_name']}: {proc.stderr.strip()}")
    resp = json.loads(proc.stdout)
    payloads = resp.get("payloads") or resp.get("messages") or []
    for p in payloads:
        text = p.get("text", "").strip()
        if text:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass
    raise RuntimeError(f"No valid response for {dr['player_name']}: {proc.stdout[:200]}")

decisions = {}
for step in plan:
    name = step["player_name"]
    try:
        result = call_bridge_for_night(step)
        action = result.get("action", "")
        decision = {"action": action}
        if result.get("targets"):
            decision["targets"] = result["targets"]
        elif result.get("target") is not None:
            decision["target"] = result["target"]
        decisions[name] = decision
        print(f"[night] {name}: {decision}", flush=True)
    except Exception as e:
        # Fallback to first legal action if AI fails
        legal = step["decision_request"]["legal_actions"]
        role = step["role"]
        if role.startswith("Troublemaker"):
            t = legal.get("targets", [])
            decisions[name] = {"action": "swap", "targets": [t[0], t[1]]}
        elif "inspect_player" in legal.get("action", ""):
            decisions[name] = {"action": "inspect_player", "target": step["decision_request"]["other_players"][0]}
        else:
            tgt = legal.get("target", [0])
            decisions[name] = {"action": legal.get("action", "inspect_center").split(" | ")[0], "target": tgt[0] if isinstance(tgt, list) else tgt}
        print(f"[night] {name}: fallback {decisions[name]} (error: {e})", flush=True)

gm_night.finalize_run(decisions_by_name=decisions, prepared_state=partial, game_dir=str(game_dir))
print(json.dumps({"game_id": prepared["game_id"], "decisions": decisions}, ensure_ascii=False))
PY

# 2) Day + vote + resolve + translate
python3 run_full_game.py >/tmp/werewolf_run_latest.log 2>&1
echo "Game ends. Now rebuild pages data..."

# 3) Rebuild pages data
python3 scripts/build_pages.py >/tmp/werewolf_build_pages.log 2>&1
echo "Rebuild pages data done. Now going to push..."

# 4) Public safety check + publish
bash scripts/check_public_repo.sh >/tmp/werewolf_public_check.log 2>&1

bash scripts/publish_pages.sh

echo "Published new game round."
