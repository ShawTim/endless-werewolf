#!/usr/bin/env bash
set -euo pipefail

cd /home/openclaw/.openclaw/workspaces/ai-werewolf

# 1) Night phase: new game + AI decisions + finalize
python3 - <<'PY'
import json, re, subprocess, time, uuid
from pathlib import Path
import gm_night
import bridge_agent

prepared = gm_night.prepare_run(start_new_game=True)
game_dir = Path(prepared["game_dir"])
plan = prepared["plan"]
partial = prepared["partial_state"]

def call_bridge_for_night(step: dict) -> dict:
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
        timeout=120,
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
        result = call_bridge_for_night(step)
        action = result.get("action", "")
        decision = {"action": action}
        decision["thought"] = result.get("thought", "")
        decision["_meta"] = result.get("_meta", {})
        if result.get("targets"):
            decision["targets"] = result["targets"]
        elif result.get("target") is not None:
            decision["target"] = result["target"]
        decisions[name] = decision
        print(f"[night] {name}: {decision}", flush=True)
    except Exception as e:
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

# 2) Day + Vote + Resolve + Postgame + Tag + Translate ZH
# Run in foreground so the cron agent waits for completion
PYTHONUNBUFFERED=1 python3 run_full_game.py 2>&1 | tee /tmp/werewolf_run_latest.log

# 3) Verify game data before publishing
echo "=== Verifying game data ==="
if ! python3 scripts/verify_game.py >/tmp/werewolf_verify.log 2>&1; then
  echo "VERIFICATION FAILED — game data unhealthy, skipping publish."
  cat /tmp/werewolf_verify.log
  exit 1
fi
echo "Verification passed."
cat /tmp/werewolf_verify.log

# 4) Rebuild pages data
python3 scripts/build_pages.py >/tmp/werewolf_build_pages.log 2>&1
echo "Pages data rebuilt."

# 5) Publish. publish_pages.sh owns the mandatory regression, archive,
# language, syntax, and public-safety gates so direct/manual publishing cannot
# bypass them.
bash scripts/publish_pages.sh
echo "Published new game round."
