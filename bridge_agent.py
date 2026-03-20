"""
Bridge Agent for AI One Night Werewolf Day Phase

Usage: Called by day_phase.py via OpenClaw runtime
Input: JSON with player_context, model, chat_history
Output: JSON decision (action, target, speech)

This agent acts as a dispatcher:
1. Receives player decision requests
2. Spawns thinker subagents with SPECIFIC models
3. Returns normalized decisions
"""

import json
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent


def build_thinker_prompt(player_context: dict, chat_history: str, turn_hints: dict | None = None) -> str:
    """Build the prompt for the thinker subagent."""
    player_name = player_context["player_name"]
    persona = player_context["persona"]
    initial_role = player_context["initial_role"]
    current_role = player_context["current_role"]
    night_memory = player_context.get("night_memory_text", "今晚冇咩特別發生。")
    turn_hints = turn_hints or {}
    was_mentioned = turn_hints.get("was_mentioned_recently", False)
    recent_speakers = turn_hints.get("recent_speakers", [])
    debate_notes = turn_hints.get("debate_notes", [])
    nudge = turn_hints.get("nudge", "")

    return f"""你正在玩《一夜狼人》。現在是白天自由辯論階段。

【你的身份】
玩家名稱：{player_name}
你的人格：{persona}
你的初始身份：{initial_role}
你此刻的身份：{current_role}

【你的夜晚記憶】
{night_memory}

【場上目前公開討論紀錄】
{chat_history}

【即場辯論訊號】
- 你最近是否被點名/提及：{was_mentioned}
- 最近發言過嘅玩家：{recent_speakers}
- 辯論提醒：{debate_notes}
- 即場提示：{nudge}

【你的任務】
請決定你的日間行動。你可以選擇 "speak"（發言）或 "pass"（沉默）。

重要策略指引（必須考慮）：
1) 如果有人點名你而你完全唔回應，通常會變得可疑（但某些角色可刻意利用）。
2) 主動發言太多亦可能被視為帶風向而可疑。
3) 你要綜合「身份策略 + 人格 + 當前場上壓力」再決定 speak 或 pass。
4) 如果你選擇 speak，優先回應最近挑戰你或主導風向嘅玩家，而唔係自說自話。

如果發言，請說出你想說的話，可以選擇性地 @ 一位玩家作為回應對象。

【輸出格式】
只輸出符合以下格式的 JSON，不要任何 markdown 標記或多餘文字：
{{
  "thought": "你的思考過程（用第一人稱）",
  "action": "speak",
  "target": "某玩家名稱 或 null",
  "speech": "你要說出的話（廣東話，符合你的人格）"
}}

注意：只輸出 JSON，唔好 ```json 標記，唔好解釋。"""


def build_postgame_prompt(player_context: dict, game_summary: dict) -> str:
    """Build the prompt for a postgame interview quote."""
    player_name = player_context["player_name"]
    persona = player_context["persona"]
    role = player_context["role"]
    team = player_context["team"]
    status = player_context["status"]
    executed = player_context["executed"]
    outcome = game_summary.get("outcome", "unknown")
    winner_team = game_summary.get("winner_team", "unknown")
    executed_players = game_summary.get("executed", [])
    chat_excerpt = game_summary.get("chat_excerpt", "")

    outcome_desc = {
        "village_win": "村民陣營獲勝",
        "werewolf_win": "狼人陣營獲勝",
        "tanner_win": "鞣皮匠獲勝",
        "village_win_no_wolf": "村民陣營獲勝（場上無狼人）",
        "no_team_win": "無人勝出",
    }.get(outcome, outcome)

    status_desc = "勝利" if status == "winner" else "落敗"
    executed_desc = "，並且被投出局" if executed else ""

    # Extract Chinese role name from "Seer (預言家)" format
    role_zh = role.split("(")[1].rstrip(")") if "(" in role else role

    name_map = game_summary.get("name_map", {})
    name_table = "\n".join(f"  {en} → {zh}" for en, zh in name_map.items()) if name_map else "  （無）"

    return f"""你係《一夜狼人》嘅玩家，現在遊戲已經結束，記者黎訪問你。

【你嘅身份】
玩家名稱：{player_name}
你嘅人格：{persona}
你嘅角色：{role_zh}
你嘅結局：{status_desc}{executed_desc}

【今局結果】
結果：{outcome_desc}
被投出局嘅玩家：{', '.join(executed_players) if executed_players else '無'}

【玩家中英文名對照（提及其他玩家時必須用中文名）】
{name_table}

【日間對話節錄（部分）】
{chat_excerpt or '（無記錄）'}

【你嘅任務】
以你嘅人格同角色，用廣東話口語講 1-2 句賽後感受。要求：
- 真實反映你嘅情緒同處境（贏/輸/被殺）
- 符合你嘅個人風格同人格
- 提及任何玩家時，必須用佢哋嘅中文名（見上方對照表）
- 唔好重複講自己係咩角色
- 全程廣東話，唔好夾英文

只輸出以下 JSON，唔好任何 markdown 或解釋：
{{"quote": "你嘅廣東話賽後感受"}}"""


def validate_decision(decision: dict) -> dict:
    """Validate and normalize thinker output."""
    action = decision.get("action")
    if action not in ("speak", "pass"):
        action = "pass"
    
    return {
        "action": action,
        "target": decision.get("target") if decision.get("target") else None,
        "speech": (decision.get("speech") or "").strip(),
        "thought": decision.get("thought", "")
    }


def spawn_thinker_subagent(model: str, prompt: str, player_name: str) -> dict:
    """
    Spawn thinker subagent with specific model.
    
    This function should be called within OpenClaw agent context
    where sessions_spawn is available.
    
    For testing outside agent context, returns placeholder.
    """
    try:
        # When running inside OpenClaw agent, we can use sessions_spawn
        # This is a placeholder for the actual implementation
        import sessions_spawn
        
        result = sessions_spawn.spawn(
            task=prompt,
            agentId="main",  # Use main as base, model will override
            model=model,
            mode="run",
            cleanup="delete",
            runTimeoutSeconds=60
        )
        
        # Extract JSON from result
        output = result.get("result", "")
        import re
        # Try full output as JSON first
        try:
            return json.loads(output.strip())
        except json.JSONDecodeError:
            pass
        # Fall back to finding first {...} block
        json_match = re.search(r'\{.*?\}', output, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        return {"action": "pass", "target": None, "speech": ""}
        
    except ImportError:
        # Not running in OpenClaw agent context
        return {
            "status": "needs_runtime",
            "message": "Thinker spawning requires OpenClaw agent runtime",
            "model": model,
            "player_name": player_name
        }


def main():
    """Entry point when called as agent."""
    # Read input JSON from stdin or argument
    if len(sys.argv) > 1:
        input_json = sys.argv[1]
    else:
        input_json = sys.stdin.read()
    
    try:
        request = json.loads(input_json)
    except json.JSONDecodeError:
        print(json.dumps({
            "action": "pass",
            "error": "Invalid JSON input"
        }, ensure_ascii=False))
        return
    
    request_type = request.get("request_type", "day_action")
    player_context = request.get("player_context", {})
    model = request.get("model") or player_context.get("model")
    if not model:
        print(json.dumps({"action": "pass", "error": f"No model specified for player {player_context.get('player_name', 'unknown')}"}, ensure_ascii=False))
        return

    if request_type == "postgame_interview":
        game_summary = request.get("game_summary", {})
        player_name = player_context.get("player_name", "unknown")
        prompt = build_postgame_prompt(player_context, game_summary)
        raw = spawn_thinker_subagent(model, prompt, player_name)
        if "status" in raw and raw["status"] == "needs_runtime":
            print(json.dumps(raw, ensure_ascii=False, indent=2))
            return
        quote = raw.get("quote", "").strip()
        print(json.dumps({"status": "ok", "quote": quote}, ensure_ascii=False, indent=2))
        return

    chat_history = request.get("chat_history", "")
    turn_hints = request.get("turn_hints", {})

    # Build thinker prompt
    thinker_prompt = build_thinker_prompt(player_context, chat_history, turn_hints=turn_hints)

    # Spawn thinker
    player_name = player_context.get("player_name", "unknown")
    decision = spawn_thinker_subagent(model, thinker_prompt, player_name)

    # If it's a needs_runtime placeholder, return it
    if "status" in decision and decision["status"] == "needs_runtime":
        print(json.dumps(decision, ensure_ascii=False, indent=2))
        return

    # Validate and normalize
    validated = validate_decision(decision)

    # Return to caller
    print(json.dumps({
        "status": "ok",
        "action": validated["action"],
        "target": validated["target"],
        "speech": validated["speech"],
        "thought": validated["thought"]
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
