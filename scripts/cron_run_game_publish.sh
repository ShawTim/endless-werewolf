#!/usr/bin/env bash
set -euo pipefail

cd /home/openclaw/.openclaw/workspaces/ai-werewolf

# 1) Start a fresh game, auto-decide night actions deterministically, finalize night.
python3 - <<'PY'
import json
from pathlib import Path
import gm_night

prepared = gm_night.prepare_run(start_new_game=True)
game_dir = Path(prepared["game_dir"])
plan = prepared["plan"]
partial = prepared["partial_state"]

decisions = {}
for step in plan:
    name = step["player_name"]
    role = step["role"]
    legal = step["decision_request"]["legal_actions"]

    if role.startswith("Werewolf"):
        decisions[name] = {"action": "inspect_center", "target": legal["target"][0]}
    elif role.startswith("Seer"):
        decisions[name] = {"action": "inspect_player", "target": legal["inspect_player"]["target"][0]}
    elif role.startswith("Robber"):
        decisions[name] = {"action": "rob", "target": legal["target"][0]}
    elif role.startswith("Troublemaker"):
        t = legal["targets"]
        decisions[name] = {"action": "swap", "targets": [t[0], t[1]]}

gm_night.finalize_run(decisions_by_name=decisions, prepared_state=partial, game_dir=str(game_dir))
print(json.dumps({"game_id": prepared["game_id"], "decisions": decisions}, ensure_ascii=False))
PY

# 2) Day + vote + resolve + translate
python3 run_full_game.py >/tmp/werewolf_run_latest.log 2>&1

# 3) Rebuild pages data
python3 scripts/build_pages.py >/tmp/werewolf_build_pages.log 2>&1

# 4) Public safety check + publish
bash scripts/check_public_repo.sh >/tmp/werewolf_public_check.log 2>&1

git add data/games docs/data data/current_game.json data/game_counter.json

if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
git commit -m "chore(cron): auto-run and publish werewolf game @ ${TS}" >/tmp/werewolf_git_commit.log 2>&1
git push origin master >/tmp/werewolf_git_push.log 2>&1

echo "Published new game round."