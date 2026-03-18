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
        # Try to find JSON in output
        import re
        json_match = re.search(r'\{[^}]*"action"[^}]*\}', output, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        
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
    
    player_context = request.get("player_context", {})
    model = request.get("model", "google/gemini-3.1-flash-lite-preview")
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
