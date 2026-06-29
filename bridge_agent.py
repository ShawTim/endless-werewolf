"""
Bridge Agent for AI One Night Werewolf

Prompt builders for player decisions (day action, vote, night action, postgame).
Each builder returns a fully-constructed prompt string that is sent to the
bridge agent via `openclaw agent --agent ai_werewolf_bridge --model <player_model>`.

Primary language: English. In-character speech is also in English.
"""

import json
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent

# Lazy import to avoid circular dependency
try:
    import cross_game_memory
except ImportError:
    cross_game_memory = None


def _get_prev_game_context(player_context: dict) -> str:
    """Fetch previous game context text, or empty string if unavailable."""
    if not cross_game_memory:
        return ""
    game_id = player_context.get("game_id", "")
    if not game_id:
        return ""
    return cross_game_memory.get_previous_game_context_for_prompt(game_id, count=1)


def build_thinker_prompt(player_context: dict, chat_history: str, turn_hints: dict | None = None) -> str:
    """Build the prompt for the day-phase free discussion decision."""
    player_name = player_context["player_name"]
    persona = player_context["persona"]
    initial_role = player_context["initial_role"]
    current_role = player_context["current_role"]
    night_memory = player_context.get("night_memory_text", "Nothing notable happened tonight.")
    turn_hints = turn_hints or {}
    was_mentioned = turn_hints.get("was_mentioned_recently", False)
    recent_speakers = turn_hints.get("recent_speakers", [])
    debate_notes = turn_hints.get("debate_notes", [])
    nudge = turn_hints.get("nudge", "")

    notes_text = "\n".join(f"  - {n}" for n in debate_notes) if debate_notes else "  (none)"

    prev_game = _get_prev_game_context(player_context)
    prev_game_section = f"\n[Previous Game Record]\n{prev_game}\n" if prev_game else ""

    return f"""You are playing One Night Werewolf. It is the daytime free discussion phase.

[Your Identity]
Player name: {player_name}
Your persona: {persona}
Your initial role: {initial_role}
Your current role: {current_role}

[Your Night Memory]
{night_memory}
{prev_game_section}
[Public Discussion Log So Far]
{chat_history or "(The discussion has just begun — nobody has spoken yet.)"}

[Live Debate Signals]
- Were you recently mentioned/challenged: {was_mentioned}
- Recent speakers: {', '.join(recent_speakers) if recent_speakers else '(none yet)'}
- Debate notes:
{notes_text}
- Nudge: {nudge}

[Your Task]
Decide your daytime action. You may choose "speak" (talk) or "pass" (stay silent).

Strategic guidelines (must consider):
1) If someone directly challenged you and you ignore it, that can look suspicious (sometimes strategically useful).
2) Speaking too aggressively can also increase suspicion.
3) Balance role strategy, persona, and current table pressure before deciding speak vs pass.
4) If you choose to speak, prioritize responding to whoever challenged you or is steering the conversation — don't just monologue.

If speaking, say what you want to say. You may optionally @ one player as your response target.

[Output Format]
Output ONLY valid JSON — no markdown fences, no explanation, no extra text:
{{
  "thought": "Your internal reasoning (first person)",
  "action": "speak",
  "target": "PlayerName or null",
  "speech": "What you say out loud (English, in-character for your persona)"
}}

If you choose to pass, set action to "pass" and speech to "".
Output JSON only. No ```json markers. No explanations."""


def build_vote_prompt(player_context: dict, chat_history: str, valid_targets: list) -> str:
    """Build the prompt for a player's vote decision."""
    player_name = player_context["player_name"]
    persona = player_context["persona"]
    initial_role = player_context["initial_role"]
    current_role = player_context["current_role"]
    night_memory = player_context.get("night_memory_text", "Nothing notable happened tonight.")
    targets_str = ", ".join(valid_targets)

    prev_game = _get_prev_game_context(player_context)
    prev_game_section = f"\n[Previous Game Record]\n{prev_game}\n" if prev_game else ""

    return f"""You are playing One Night Werewolf. The daytime discussion has ended — it is now the voting phase.

[Your Identity]
Player name: {player_name}
Your persona: {persona}
Your initial role: {initial_role}
Your current role: {current_role}

[Your Night Memory]
{night_memory}
{prev_game_section}
[Full Discussion Record]
{chat_history or "(No discussion occurred.)"}

[Valid Vote Targets]
{targets_str}

[Your Task]
Based on the discussion, your role's win condition, and your persona, vote to exile one player.

Voting strategy hints:
- Village team: Vote for the player you most suspect is a Werewolf.
- Werewolf team: Vote for the player who is the biggest threat to you.
- Tanner: Your goal is to get yourself voted out. Consider how to make people vote for you.

[Output Format]
Output ONLY valid JSON — no markdown, no extra text:
{{"thought": "Your voting reasoning", "vote_target": "PlayerName"}}

vote_target must be one of: {targets_str}
Output JSON only. No ```json markers. No explanations."""


def build_night_action_prompt(decision_request: dict) -> str:
    """Build the prompt for a player's night action decision."""
    player_name = decision_request["player_name"]
    persona = decision_request["persona"]
    role = decision_request["initial_role"]
    night_memory = decision_request.get("night_memory", [])
    other_players = decision_request.get("other_players", [])
    legal_actions = decision_request.get("legal_actions", {})

    memory_text = "\n".join(f"  - {m}" for m in night_memory) if night_memory else "(No information yet)"
    others_text = ", ".join(other_players)
    legal_text = json.dumps(legal_actions, ensure_ascii=False, indent=2)

    prev_game = _get_prev_game_context(decision_request)
    prev_game_section = f"\n[Previous Game Record]\n{prev_game}\n" if prev_game else ""

    return f"""You are playing One Night Werewolf. It is the night action phase.

[Your Identity]
Player name: {player_name}
Your persona: {persona}
Your role: {role}

[What You Know So Far]
{memory_text}
{prev_game_section}
[Other Players]
{others_text}

[Legal Actions Available]
{legal_text}

[Your Task]
Choose one legal action based on your role's ability and your strategy.

Role strategy hints:
- Werewolf: If you are the solo wolf, peek at a center card for intel. If there are two wolves, you recognize each other.
- Seer: Choose a player to inspect, or look at two center cards for intel.
- Robber: Choose a target to swap roles with — consider whose role is most valuable to steal.
- Troublemaker: Choose two targets to swap — create chaos to mislead the village.

[Output Format]
Output ONLY valid JSON — no markdown, no extra text.

For Werewolf or Robber (single target):
{{"thought": "Your reasoning", "action": "action_name", "target": target_value}}

For Troublemaker (two targets):
{{"thought": "Your reasoning", "action": "swap", "targets": ["PlayerA", "PlayerB"]}}

For Seer inspecting a player:
{{"thought": "Your reasoning", "action": "inspect_player", "target": "PlayerName"}}

For Seer inspecting center cards:
{{"thought": "Your reasoning", "action": "inspect_center", "targets": [0, 1]}}

Output JSON only. No ```json markers. No explanations."""


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
        "village_win": "Village team wins",
        "werewolf_win": "Werewolf team wins",
        "tanner_win": "Tanner wins",
        "village_win_no_wolf": "Village team wins (no werewolf in play)",
        "no_team_win": "No team wins",
    }.get(outcome, outcome)

    status_desc = "won" if status == "winner" else "lost"
    executed_desc = " and was voted out" if executed else ""

    return f"""You are a player in One Night Werewolf. The game has ended and a reporter is interviewing you.

[Your Identity]
Player name: {player_name}
Your persona: {persona}
Your role: {role}
Your result: {status_desc}{executed_desc}

[Game Result]
Outcome: {outcome_desc}
Voted out: {', '.join(executed_players) if executed_players else 'Nobody'}

[Excerpt from the Daytime Discussion]
{chat_excerpt or '(No record)'}

[Your Task]
In character with your persona, give 1-2 sentences of postgame reaction. Requirements:
- Authetically reflect your emotion and situation (win/loss/was killed)
- Stay true to your personal style and persona
- When mentioning other players, use their English names exactly as given in the game
- Don't just repeat your role name
- Speak in English

Output ONLY this JSON — no markdown, no explanation:
{{"quote": "Your postgame reaction"}}"""


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
        import sessions_spawn
        
        result = sessions_spawn.spawn(
            task=prompt,
            agentId="main",
            model=model,
            mode="run",
            cleanup="delete",
            runTimeoutSeconds=60
        )
        
        output = result.get("result", "")
        try:
            return json.loads(output.strip())
        except json.JSONDecodeError:
            pass
        json_match = re.search(r'\{.*?\}', output, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        return {"action": "pass", "target": None, "speech": ""}
        
    except ImportError:
        return {
            "status": "needs_runtime",
            "message": "Thinker spawning requires OpenClaw agent runtime",
            "model": model,
            "player_name": player_name
        }


def main():
    """Entry point when called as a script."""
    if len(sys.argv) > 1:
        input_json = sys.argv[1]
    else:
        input_json = sys.stdin.read()
    
    try:
        request = json.loads(input_json)
    except json.JSONDecodeError:
        print(json.dumps({"action": "pass", "error": "Invalid JSON input"}, ensure_ascii=False))
        return
    
    request_type = request.get("request_type", "day_action")
    player_context = request.get("player_context", {})
    model = request.get("model") or player_context.get("model")
    
    if not model:
        print(json.dumps({"action": "pass", "error": f"No model specified for player {player_context.get('player_name', 'unknown')}"}, ensure_ascii=False))
        return

    if request_type == "vote":
        chat_history = request.get("chat_history", "")
        valid_targets = request.get("valid_targets", [])
        player_name = player_context.get("player_name", "unknown")
        prompt = build_vote_prompt(player_context, chat_history, valid_targets)
        raw = spawn_thinker_subagent(model, prompt, player_name)
        if "status" in raw and raw["status"] == "needs_runtime":
            print(json.dumps(raw, ensure_ascii=False, indent=2))
            return
        vote_target = raw.get("vote_target", "")
        if vote_target not in valid_targets and valid_targets:
            vote_target = valid_targets[0]
        print(json.dumps({"status": "ok", "vote_target": vote_target, "thought": raw.get("thought", "")}, ensure_ascii=False, indent=2))
        return

    if request_type == "night_action":
        decision_request = request.get("decision_request", {})
        player_name = player_context.get("player_name", decision_request.get("player_name", "unknown"))
        prompt = build_night_action_prompt(decision_request)
        raw = spawn_thinker_subagent(model, prompt, player_name)
        if "status" in raw and raw["status"] == "needs_runtime":
            print(json.dumps(raw, ensure_ascii=False, indent=2))
            return
        result = {
            "status": "ok",
            "action": raw.get("action", ""),
            "target": raw.get("target"),
            "targets": raw.get("targets"),
            "thought": raw.get("thought", ""),
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
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
    thinker_prompt = build_thinker_prompt(player_context, chat_history, turn_hints=turn_hints)
    player_name = player_context.get("player_name", "unknown")
    decision = spawn_thinker_subagent(model, thinker_prompt, player_name)

    if "status" in decision and decision["status"] == "needs_runtime":
        print(json.dumps(decision, ensure_ascii=False, indent=2))
        return

    validated = validate_decision(decision)
    print(json.dumps({
        "status": "ok",
        "action": validated["action"],
        "target": validated["target"],
        "speech": validated["speech"],
        "thought": validated["thought"]
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()