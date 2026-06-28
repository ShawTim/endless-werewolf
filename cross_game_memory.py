"""
Cross-game memory: loads previous game data for injection into night/day prompts.

Each player receives the full game data from the previous game:
- night_result (roles, night actions)
- day_result (all speeches)
- vote_result (who voted for whom)
- resolve_result (final roles, outcome, executed)

This gives characters awareness of past games without manual summarization.
"""
import json
from pathlib import Path
from typing import Any

WORKSPACE = Path(__file__).resolve().parent
DATA_GAMES = WORKSPACE / "data" / "games"


def _load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def get_previous_game_ids(current_game_id: str, count: int = 1) -> list[str]:
    """Get the N most recent completed game IDs before the current game."""
    if not DATA_GAMES.exists():
        return []

    game_ids = []
    for d in sorted(DATA_GAMES.glob("game_*")):
        gid = d.name
        if gid == current_game_id:
            continue
        manifest = _load_json(d / "manifest.json")
        if manifest and manifest.get("status") == "completed":
            game_ids.append(gid)

    # Return the most recent N (sorted ascending, so take last N)
    return game_ids[-count:] if game_ids else []


def load_previous_game_data(game_id: str) -> dict[str, Any] | None:
    """Load full game data for a single game ID."""
    game_dir = DATA_GAMES / game_id
    if not game_dir.exists():
        return None

    night = _load_json(game_dir / "night_result.json")
    day = _load_json(game_dir / "day_result.json")
    vote = _load_json(game_dir / "vote_result.json")
    resolve = _load_json(game_dir / "resolve_result.json")

    if not night:
        return None

    return {
        "game_id": game_id,
        "night_result": night,
        "day_result": day,
        "vote_result": vote,
        "resolve_result": resolve,
    }


def build_previous_game_context(current_game_id: str, count: int = 1) -> str:
    """
    Build a text block of previous game data for prompt injection.
    Returns empty string if no previous games exist.
    """
    prev_ids = get_previous_game_ids(current_game_id, count)
    if not prev_ids:
        return ""

    blocks = []
    for gid in prev_ids:
        data = load_previous_game_data(gid)
        if not data:
            continue

        night = data["night_result"] or {}
        day = data["day_result"] or {}
        vote = data["vote_result"] or {}
        resolve = data["resolve_result"] or {}

        # Build a compact but complete game record
        lines = []
        lines.append(f"=== Previous Game: {gid} ===")
        lines.append("")

        # Roles
        players = night.get("players", {})
        if players:
            lines.append("[Role Assignments]")
            for pid, p in sorted(players.items()):
                lines.append(f"  {p.get('name', '?')}: initial_role={p.get('initial_role', '?')}, current_role={p.get('current_role', '?')}")
            lines.append("")

        # Night actions
        night_trace = night.get("night_trace", [])
        if night_trace:
            lines.append("[Night Actions]")
            for t in night_trace:
                actor = t.get("actor", "?")
                action = t.get("action", "?")
                role = t.get("role", "")
                target = t.get("target", "")
                targets = t.get("targets", [])
                detail = f"target={target}" if target else (f"targets={targets}" if targets else "")
                lines.append(f"  {actor} ({role}): {action} {detail}")
            lines.append("")

        # Center cards
        center = night.get("center_cards", [])
        if center:
            lines.append(f"[Center Cards] {', '.join(center)}")
            lines.append("")

        # Day speeches
        day_trace = day.get("day_trace", [])
        speeches = [t for t in day_trace if t.get("type") == "speech"]
        if speeches:
            lines.append("[Day Discussion]")
            for s in speeches:
                speaker = s.get("player_name", "?")
                target = s.get("target", "")
                text = s.get("speech", "")
                prefix = f"{speaker} @{target}:" if target else f"{speaker}:"
                lines.append(f"  {prefix} {text}")
            lines.append("")

        # Votes
        votes = vote.get("votes", {})
        if votes:
            lines.append("[Votes]")
            for voter, target in votes.items():
                lines.append(f"  {voter} -> {target}")
            tally = vote.get("tally", {})
            if tally:
                lines.append("[Tally]")
                for name, count in sorted(tally.items(), key=lambda x: -x[1]):
                    lines.append(f"  {name}: {count}")
            lines.append("")

        # Resolve
        if resolve:
            lines.append(f"[Outcome] {resolve.get('outcome', '?')}")
            lines.append(f"[Reason] {resolve.get('reason', '')}")
            executed = resolve.get("executed", [])
            if executed:
                lines.append(f"[Executed] {', '.join(executed)}")
            winners = resolve.get("winners", [])
            if winners:
                lines.append(f"[Winners] {', '.join(winners)}")
            final_roles = resolve.get("final_roles", {})
            if final_roles:
                lines.append("[Final Roles]")
                for name, info in final_roles.items():
                    lines.append(f"  {name}: {info.get('current_role', '?')} ({info.get('team', '?')})")
            lines.append("")

        blocks.append("\n".join(lines))

    return "\n".join(blocks) if blocks else ""


def get_previous_game_context_for_prompt(current_game_id: str, count: int = 1) -> str:
    """
    Main entry point: returns previous game context text for prompt injection.
    Returns empty string if no previous games available.
    """
    return build_previous_game_context(current_game_id, count)