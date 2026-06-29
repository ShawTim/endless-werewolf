#!/usr/bin/env bash
set -euo pipefail

cd /home/openclaw/.openclaw/workspaces/ai-werewolf

echo "=== Dry Run: Full Game Pipeline ==="
echo ""

# 1. Night phase: prepare + AI decisions + finalize
echo "[1/6] Night phase..."
python3 - <<'PY'
import json, subprocess
from pathlib import Path
import gm_night, bridge_agent

prepared = gm_night.prepare_run(start_new_game=True)
game_dir = Path(prepared["game_dir"])
plan = prepared["plan"]
partial = prepared["partial_state"]

def call_bridge(step):
    dr = step["decision_request"]
    model = dr.get("model", "")
    thinking = dr.get("thinking", "high")
    prompt = bridge_agent.build_night_action_prompt(dr)
    proc = subprocess.run(
        ["openclaw", "agent", "--agent", "ai_werewolf_bridge",
         "--message", prompt, "--json",
         "--model", model, "--thinking", thinking],
        cwd=str(Path(".")),
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"bridge failed for {dr['player_name']}: {proc.stderr.strip()}")
    resp = json.loads(proc.stdout)
    result = (((resp or {}).get("result") or {}).get("payloads") or [])
    if not result:
        raise RuntimeError(f"No payloads for {dr['player_name']}: {proc.stdout[:200]}")
    text = (result[0].get("text") or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start:end+1])
        raise RuntimeError(f"No valid JSON for {dr['player_name']}: {text[:200]}")

decisions = {}
for step in plan:
    name = step["player_name"]
    try:
        result = call_bridge(step)
        decision = {"action": result.get("action", "")}
        if result.get("targets"):
            decision["targets"] = result["targets"]
        elif result.get("target") is not None:
            decision["target"] = result["target"]
        decisions[name] = decision
        print(f"  [night] {name}: {decision}")
    except Exception as e:
        legal = step["decision_request"]["legal_actions"]
        role = step["role"]
        if role.startswith("Troublemaker"):
            t = legal.get("targets", [])
            decisions[name] = {"action": "swap", "targets": [t[0], t[1]]}
        elif "inspect_player" in str(legal.get("action", "")):
            decisions[name] = {"action": "inspect_player", "target": step["decision_request"]["other_players"][0]}
        else:
            tgt = legal.get("target", [0])
            decisions[name] = {"action": "inspect_center", "target": tgt[0] if isinstance(tgt, list) else tgt}
        print(f"  [night] {name}: fallback {decisions[name]} (error: {e})")

gm_night.finalize_run(decisions_by_name=decisions, prepared_state=partial, game_dir=str(game_dir))
print(f"  Night done: {prepared['game_id']}")
PY

# 2. Day + Vote + Resolve + Postgame + Tag + Translate ZH
# keepalive output prevents CLI harness idle-kill
echo "[2/6] Day + Vote phase..."
PYTHONUNBUFFERED=1 python3 run_full_game.py &
RUN_PID=$!
while kill -0 "$RUN_PID" 2>/dev/null; do
  echo "  [keepalive] run_full_game still running: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  sleep 30
done
wait "$RUN_PID"

# 3. Verify: show postgame EN + ZH
echo ""
echo "=== Postgame Quotes (EN) ==="
python3 - <<'PY'
import json
from pathlib import Path
import state_manager
current = state_manager.get_current_game()
game_dir = current["game_dir"]
en = json.loads(Path(game_dir / "postgame_result.json").read_text())
for group, players in en["interviews"].items():
    for p in players:
        print(f"  [{p['player_name']}] ({p['role']}, {group}):")
        print(f"    {p['quote']}")
        print()
PY

echo "=== Postgame Quotes (ZH) ==="
python3 - <<'PY'
import json
from pathlib import Path
import state_manager
current = state_manager.get_current_game()
game_dir = current["game_dir"]
zh_path = Path(game_dir / "postgame_result_zh.json")
if not zh_path.exists():
    print("  (no _zh file)")
else:
    zh = json.loads(zh_path.read_text())
    for group, players in zh["interviews"].items():
        for p in players:
            print(f"  [{p['player_name']}] ({p['role']}, {group}):")
            print(f"    {p['quote']}")
            print()
PY

echo "=== Dry Run Complete ==="