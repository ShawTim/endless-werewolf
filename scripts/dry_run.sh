#!/usr/bin/env bash
# Full game pipeline: night → day → vote → resolve → postgame → tag → translate_zh
# Usage: ./scripts/dry_run.sh [count]   (default count=1)
# Each run starts a new game automatically. No publish.
set -euo pipefail

cd /home/openclaw/.openclaw/workspaces/ai-werewolf

COUNT="${1:-1}"

echo "=== AI Werewolf Full Pipeline ==="
echo "Games to run: $COUNT"
echo ""

run_one_game() {
  local idx="$1"
  echo ""
  echo "============================================"
  echo "  Game $idx / $COUNT"
  echo "============================================"
  echo ""

  # 1. Night phase: new game + prepare + AI decisions + finalize
  echo "[1/6] Night phase..."
  python3 - <<'PY'
import json, re, subprocess, time, uuid
from pathlib import Path
import gm_night, bridge_agent

prepared = gm_night.prepare_run(start_new_game=True)
game_dir = Path(prepared["game_dir"])
plan = prepared["plan"]
partial = prepared["partial_state"]

def call_bridge(step):
    dr = step["decision_request"]
    model = dr.get("model", "")
    thinking = dr.get("thinking", "off")
    prompt = bridge_agent.build_night_action_prompt(dr)
    started = time.perf_counter()
    proc = subprocess.run(
        ["openclaw", "agent", "--agent", "ai_werewolf_bridge",
         "--message", prompt, "--json",
         "--model", model, "--thinking", thinking,
         "--session-id", str(uuid.uuid4())],
        cwd=".",
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
        decision = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            decision = json.loads(text[start:end+1])
        else:
            raise RuntimeError(f"No valid JSON for {dr['player_name']}: {text[:200]}")
    decision["_meta"] = {
        "model": model, "thinking": thinking,
        "latency_ms": round((time.perf_counter() - started) * 1000),
    }
    if re.search(r"[\u3400-\u9fff]", decision.get("thought", "")):
        raise RuntimeError(f"Non-English night reasoning from {dr['player_name']}")
    return decision

decisions = {}
for step in plan:
    name = step["player_name"]
    try:
        result = call_bridge(step)
        decision = {"action": result.get("action", "")}
        decision["thought"] = result.get("thought", "")
        decision["_meta"] = result.get("_meta", {})
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
  echo "[2/6] Day + Vote phase..."
  echo "[3/6] Resolve phase..."
  echo "[4/6] Postgame interviews..."
  echo "[5/6] Tag phase..."
  echo "[6/6] Translate to ZH..."
  PYTHONUNBUFFERED=1 python3 run_full_game.py

  # 3. Verify
  echo ""
  echo "--- Verify ---"
  python3 scripts/verify_game.py || echo "(verify failed but continuing dry run)"

  # 4. Show postgame quotes
  echo ""
  echo "--- Postgame Quotes (EN) ---"
  python3 - <<'PY'
import json
from pathlib import Path
import state_manager
current = state_manager.get_current_game()
game_dir = Path(current["game_dir"])
en_path = game_dir / "postgame_result.json"
if not en_path.exists():
    print("  (no postgame_result.json)")
else:
    en = json.loads(en_path.read_text())
    for group, players in en.get("interviews", {}).items():
        for p in players:
            print(f"  [{p['player_name']}] ({p.get('role','')}, {group}):")
            print(f"    {p.get('quote','')}")
            print()
PY

  echo "--- Postgame Quotes (ZH) ---"
  python3 - <<'PY'
import json
from pathlib import Path
import state_manager
current = state_manager.get_current_game()
game_dir = Path(current["game_dir"])
zh_path = game_dir / "postgame_result_zh.json"
if not zh_path.exists():
    print("  (no _zh file)")
else:
    zh = json.loads(zh_path.read_text())
    for group, players in zh.get("interviews", {}).items():
        for p in players:
            print(f"  [{p['player_name']}] ({p.get('role','')}, {group}):")
            print(f"    {p.get('quote','')}")
            print()
PY

  echo ""
  echo "Game $idx complete."
}

for i in $(seq 1 "$COUNT"); do
  run_one_game "$i"
done

echo ""
echo "=== All $COUNT game(s) complete ==="
