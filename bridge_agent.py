"""
Bridge Agent for AI One Night Werewolf

Prompt builders for player decisions (day action, vote, night action, postgame).
Each builder returns a fully-constructed prompt string that is sent to the
bridge agent via `openclaw agent --agent ai_werewolf_bridge --model <player_model>`.

Primary language: English. In-character speech is also in English.

Day-debate decisions carry optional structured fields that the replay UI
consumes (all are normalised by ``validate_decision`` / ``validate_vote``):

  reply_to      exact name of the player whose earlier speech this answers, or null
  stance        "accuse" | "defend" | "question" | "support" toward ``target``, or null
  claimed_role  canonical role (data/roles_pool.json) publicly claimed as the
                speaker's STARTING role this turn, or null
  suspicions    {other player name: int 0-100} private P(werewolf team) estimate
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path
from typing import Any, Iterable

WORKSPACE = Path(__file__).resolve().parent
ROLES_POOL_PATH = WORKSPACE / "data" / "roles_pool.json"

STANCES = ("accuse", "defend", "question", "support")
_FALLBACK_ROLES = (
    "Werewolf", "Seer", "Robber", "Troublemaker",
    "Villager", "Tanner", "Minion", "Insomniac",
)
_NULL_STRINGS = {"", "null", "none", "n/a", "na", "nobody", "no one", "-"}


def load_role_whitelist(path: Path = ROLES_POOL_PATH) -> tuple[str, ...]:
    """Canonical English role names in play (deduplicated, pool order)."""
    try:
        pool = json.loads(path.read_text(encoding="utf-8"))
        roles = [r for r in pool if isinstance(r, str) and r.strip()]
    except (OSError, ValueError):
        roles = []
    if not roles:
        roles = list(_FALLBACK_ROLES)
    seen: list[str] = []
    for role in roles:
        if role not in seen:
            seen.append(role)
    return tuple(seen)


ROLE_WHITELIST = load_role_whitelist()

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


def _format_suspicions(suspicions: Any) -> str:
    if not isinstance(suspicions, dict) or not suspicions:
        return "  (none yet — this is your first estimate)"
    return "\n".join(f"  - {name}: {value}" for name, value in suspicions.items())


def _suspicion_template(others: list[str]) -> str:
    if not others:
        return '{"<other player name>": 0-100, ...}'
    inner = ", ".join(f'"{name}": 0-100' for name in others)
    return "{" + inner + "}"


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
    others = [n for n in (turn_hints.get("other_players") or []) if n != player_name]
    addressed_by = [n for n in (turn_hints.get("addressed_by") or []) if n != player_name]
    addressed_stances = turn_hints.get("addressed_stances") or {}
    public_claims = turn_hints.get("public_claims") or {}
    my_last_suspicions = turn_hints.get("my_last_suspicions") or {}

    notes_text = "\n".join(f"  - {n}" for n in debate_notes) if debate_notes else "  (none)"
    if addressed_by:
        addressed_text = ", ".join(
            f"{n} ({addressed_stances[n]})" if addressed_stances.get(n) else n
            for n in addressed_by
        )
    else:
        addressed_text = "(nobody)"
    if public_claims:
        claims_text = "\n".join(f"  - {n}: claims to have started as {r}" for n, r in public_claims.items())
    else:
        claims_text = "  (no role claims yet)"
    roles_text = ", ".join(ROLE_WHITELIST)
    others_text = ", ".join(others) if others else "(see the discussion log)"

    prev_game = _get_prev_game_context(player_context)
    prev_game_section = f"\n[Previous Game Record]\n{prev_game}\n" if prev_game else ""

    return f"""You are playing One Night Werewolf. It is the daytime free discussion phase.

[Your Identity]
Player name: {player_name}
Your persona: {persona}
Your initial role: {initial_role}
Your current role: {current_role}

[Other Players — use these exact names]
{others_text}

[Roles In This Game]
{roles_text}

[Your Night Memory]
{night_memory}
{prev_game_section}
[Public Discussion Log So Far]
{chat_history or "(The discussion has just begun — nobody has spoken yet.)"}

[Live Debate Signals]
- Were you recently mentioned/challenged: {was_mentioned}
- Players who recently addressed you directly: {addressed_text}
- Recent speakers: {', '.join(recent_speakers) if recent_speakers else '(none yet)'}
- Public role claims so far:
{claims_text}
- Debate notes:
{notes_text}
- Nudge: {nudge}

[Your Previous Suspicion Estimates]
Your own private estimates from your last turn (0 = certainly NOT on the werewolf team, 100 = certainly on the werewolf team):
{_format_suspicions(my_last_suspicions)}
Update these based on what has been said since — do not restart from scratch.

[Your Task]
Decide your daytime action. You may choose "speak" (talk) or "pass" (stay silent).

Language requirement:
- Write both "thought" and "speech" entirely in English.
- Do not use Chinese, Cantonese, or any other language.

Strategic guidelines (must consider):
1) If someone directly challenged you and you ignore it, that can look suspicious (sometimes strategically useful).
2) Speaking too aggressively can also increase suspicion.
3) Balance role strategy, persona, and current table pressure before deciding speak vs pass.
4) If you choose to speak, prioritize responding to whoever challenged you or is steering the conversation — don't just monologue.

Interaction requirements:
- This is a debate, not a series of speeches. When you speak, reply to or challenge a SPECIFIC player's earlier statement whenever possible: quote or paraphrase what they said and react to it.
- Set "reply_to" to the exact name of the player whose earlier speech you are answering (null only if you are opening the discussion or not answering anyone).
- Set "target" to the player your speech is aimed at, and "stance" to your attitude toward that target: "accuse" (you think they are lying / on the werewolf team), "defend" (you argue they are innocent), "question" (you demand information or clarification), or "support" (you agree with / back their claim). If target is null, stance must be null.
- Set "claimed_role" to the role you publicly claim in THIS speech as your STARTING role (one of: {roles_text}). Use null if you make no role claim in this speech. You may bluff, but claimed_role must match what your speech says.
- Always fill "suspicions" with your private probability (integer 0-100) that each OTHER player is on the werewolf team (Werewolf or Minion), covering every other player and never yourself. Fill it even if you pass.

[Output Format]
Output ONLY valid JSON — no markdown fences, no explanation, no extra text:
{{
  "thought": "Your internal reasoning (first person)",
  "action": "speak",
  "target": "PlayerName or null",
  "reply_to": "PlayerName or null",
  "stance": "accuse | defend | question | support | null",
  "claimed_role": "RoleName or null",
  "suspicions": {_suspicion_template(others)},
  "speech": "What you say out loud (English, in-character for your persona)"
}}

If you choose to pass, set action to "pass", speech to "", target/reply_to/stance/claimed_role to null, and still fill "suspicions".
Output JSON only. No ```json markers. No explanations."""


def build_vote_prompt(
    player_context: dict,
    chat_history: str,
    valid_targets: list,
    my_last_suspicions: dict | None = None,
) -> str:
    """Build the prompt for a player's vote decision."""
    player_name = player_context["player_name"]
    persona = player_context["persona"]
    initial_role = player_context["initial_role"]
    current_role = player_context["current_role"]
    night_memory = player_context.get("night_memory_text", "Nothing notable happened tonight.")
    targets_str = ", ".join(valid_targets)
    others = [t for t in valid_targets if t != player_name]

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

[Your Last Suspicion Estimates From The Discussion]
(0 = certainly NOT on the werewolf team, 100 = certainly on the werewolf team)
{_format_suspicions(my_last_suspicions)}

[Valid Vote Targets]
{targets_str}

[Your Task]
Based on the discussion, your role's win condition, and your persona, vote to exile one player.
Also give your FINAL private suspicion estimates: for every other player, an integer 0-100 probability that they are on the werewolf team (Werewolf or Minion). Update your last estimates rather than restarting. Never include yourself.

Language requirement:
- Write "thought" entirely in English.
- Do not use Chinese or Cantonese.

Voting strategy hints:
- Village team: Vote for the player you most suspect is a Werewolf.
- Werewolf team: Vote for the player who is the biggest threat to you.
- Tanner: Your goal is to get yourself voted out. Consider how to make people vote for you.

[Output Format]
Output ONLY valid JSON — no markdown, no extra text:
{{"thought": "Your voting reasoning", "vote_target": "PlayerName", "suspicions": {_suspicion_template(others)}}}

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

Language requirement:
- Write "thought" entirely in English.
- Do not use Chinese or Cantonese.

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


# ---------------------------------------------------------------------------
# Normalisers for structured debate fields
# ---------------------------------------------------------------------------

_STANCE_PREFIXES = (
    ("accus", "accuse"),
    ("defen", "defend"),
    ("question", "question"),
    ("support", "support"),
)
_SCORE_RE = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*%?\s*$")


def _clean_token(value: Any) -> str | None:
    """Strip markup/whitespace from a model-supplied name or label."""
    if not isinstance(value, str):
        return None
    text = " ".join(value.split()).strip()
    text = text.lstrip("@").strip()
    if len(text) >= 2 and text[0] in "[<" and text[-1] in "]>":
        text = text[1:-1].strip()
    if text.casefold() in _NULL_STRINGS:
        return None
    return text


def _loose_key(text: str) -> str:
    key = text.casefold()
    return key[4:] if key.startswith("the ") else key


def match_player(value: Any, roster: Iterable[str] | None, exclude: str | None = None) -> str | None:
    """Map a model-supplied player reference to an exact roster name.

    Returns None for unknown names and for ``exclude`` (the speaker). When no
    roster is available, any non-empty name other than ``exclude`` is kept.
    """
    text = _clean_token(value)
    if not text:
        return None
    if roster is None:
        return text if text != exclude else None
    names = [n for n in roster if isinstance(n, str) and n]
    if text in names:
        match = text
    else:
        loose = [n for n in names if _loose_key(n) == _loose_key(text)]
        match = loose[0] if len(loose) == 1 else None
    if match is None or match == exclude:
        return None
    return match


def normalize_stance(value: Any) -> str | None:
    text = _clean_token(value)
    if not text:
        return None
    key = text.casefold()
    if key in STANCES:
        return key
    for prefix, stance in _STANCE_PREFIXES:
        if key.startswith(prefix):
            return stance
    return None


def normalize_claimed_role(value: Any, roles: Iterable[str] | None = None) -> str | None:
    text = _clean_token(value)
    if not text:
        return None
    allowed = tuple(roles) if roles is not None else ROLE_WHITELIST
    key = _loose_key(text)
    for role in allowed:
        if role.casefold() == key:
            return role
    return None


def _coerce_score(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        m = _SCORE_RE.match(value)
        if not m:
            return None
        number = float(m.group(1))
    else:
        return None
    return number if math.isfinite(number) else None


def normalize_suspicions(
    raw: Any,
    player_name: str | None = None,
    roster: Iterable[str] | None = None,
) -> dict[str, int] | None:
    """Normalise a {player: P(werewolf team)} map to {exact name: int 0-100}.

    Drops self, unknown names and non-numeric values; clamps to 0-100. If every
    value is a probability in [0, 1] and at least one is fractional, values are
    treated as fractions and scaled by 100. Returns None when nothing survives.
    """
    if not isinstance(raw, dict):
        return None
    names = list(roster) if roster is not None else None
    parsed: dict[str, float] = {}
    for key, value in raw.items():
        name = match_player(key, names, exclude=player_name)
        score = _coerce_score(value)
        if name is None or score is None:
            continue
        parsed[name] = score
    if not parsed:
        return None
    values = list(parsed.values())
    if all(0.0 <= v <= 1.0 for v in values) and any(v != int(v) for v in values):
        parsed = {k: v * 100.0 for k, v in parsed.items()}
    result = {k: int(round(min(100.0, max(0.0, v)))) for k, v in parsed.items()}
    if names is not None:
        result = {n: result[n] for n in names if n in result}
    return result


def _text(value: Any) -> str:
    if value is None:
        return ""
    return value.strip() if isinstance(value, str) else str(value).strip()


def validate_decision(
    decision: dict,
    player_name: str | None = None,
    player_names: Iterable[str] | None = None,
    spoken_players: Iterable[str] | None = None,
) -> dict:
    """Validate and normalize thinker output.

    ``player_names`` is the full roster (used to validate target / reply_to /
    suspicion keys); ``spoken_players`` (optional) restricts ``reply_to`` to
    players who have actually spoken already. Unknown/invalid values become
    None. ``stance`` describes the attitude toward ``target``; if the model set
    a stance with only ``reply_to``, the reply recipient becomes the target.
    """
    if not isinstance(decision, dict):
        decision = {}
    roster = list(player_names) if player_names is not None else None
    action = decision.get("action")
    if action not in ("speak", "pass"):
        action = "pass"

    target = match_player(decision.get("target"), roster, exclude=player_name)
    reply_to = match_player(decision.get("reply_to"), roster, exclude=player_name)
    if reply_to is not None and spoken_players is not None and reply_to not in set(spoken_players):
        reply_to = None
    stance = normalize_stance(decision.get("stance"))
    claimed_role = normalize_claimed_role(decision.get("claimed_role"))
    suspicions = normalize_suspicions(decision.get("suspicions"), player_name, roster)

    if action == "pass":
        target = reply_to = stance = claimed_role = None
    elif stance is not None and target is None:
        target = reply_to
        if target is None:
            stance = None

    return {
        "action": action,
        "target": target,
        "speech": _text(decision.get("speech")) if action == "speak" else "",
        "thought": _text(decision.get("thought")),
        "reply_to": reply_to,
        "stance": stance,
        "claimed_role": claimed_role,
        "suspicions": suspicions,
    }


def validate_vote(
    raw: dict,
    player_name: str | None = None,
    valid_targets: Iterable[str] | None = None,
    player_names: Iterable[str] | None = None,
) -> dict:
    """Validate and normalize vote output.

    ``vote_target`` is None when the model did not name a valid target (callers
    decide the fallback). Suspicion keys are validated against ``player_names``
    if given, otherwise against ``valid_targets``.
    """
    if not isinstance(raw, dict):
        raw = {}
    targets = list(valid_targets) if valid_targets is not None else None
    roster = list(player_names) if player_names is not None else targets
    return {
        "vote_target": match_player(raw.get("vote_target"), targets, exclude=player_name),
        "thought": _text(raw.get("thought")),
        "suspicions": normalize_suspicions(raw.get("suspicions"), player_name, roster),
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
            runTimeoutSeconds=120
        )
        
        output = result.get("result", "")
        try:
            return json.loads(output.strip())
        except json.JSONDecodeError:
            pass
        # Greedy first-"{" to last-"}" so nested objects (suspicions) survive.
        json_match = re.search(r'\{.*\}', output, re.DOTALL)
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
        my_last = request.get("my_last_suspicions") or player_context.get("my_last_suspicions")
        prompt = build_vote_prompt(player_context, chat_history, valid_targets, my_last_suspicions=my_last)
        raw = spawn_thinker_subagent(model, prompt, player_name)
        if "status" in raw and raw["status"] == "needs_runtime":
            print(json.dumps(raw, ensure_ascii=False, indent=2))
            return
        vote = validate_vote(raw, player_name, valid_targets, request.get("player_names"))
        vote_target = vote["vote_target"]
        if vote_target is None:
            vote_target = valid_targets[0] if valid_targets else ""
        print(json.dumps({
            "status": "ok",
            "vote_target": vote_target,
            "thought": vote["thought"],
            "suspicions": vote["suspicions"],
        }, ensure_ascii=False, indent=2))
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

    roster = request.get("player_names") or turn_hints.get("all_players")
    if not roster and turn_hints.get("other_players"):
        roster = list(turn_hints["other_players"]) + [player_name]
    validated = validate_decision(
        decision,
        player_name=player_name,
        player_names=roster or None,
        spoken_players=turn_hints.get("spoken_players"),
    )
    print(json.dumps({"status": "ok", **validated}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
