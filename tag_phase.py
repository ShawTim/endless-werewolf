"""
Tagging post-processing: parse generated game data and add <Role> / [Player] markup.

Runs AFTER game engine generates data, BEFORE translation.
This ensures:
1. Consistent role/player name highlighting in the frontend
2. Translation engine uses tag content as a lookup table (Seer→預言家, never 先知)

Pipeline: game gen → tag_phase → translate_zh_phase → build_pages → publish
"""

import json
import re
from pathlib import Path
from typing import Any

# ---- Canonical name tables ----
# English role names (as defined in night_phase.py ROLE_* constants)
ROLES_EN = [
    "Werewolf", "Seer", "Robber", "Troublemaker",
    "Villager", "Tanner", "Minion", "Insomniac",
]

# English → Chinese role mapping (canonical, never changes)
ROLES_ZH = {
    "Werewolf": "狼人", "Seer": "預言家", "Robber": "強盜",
    "Troublemaker": "搗蛋鬼", "Villager": "村民",
    "Tanner": "皮匠", "Minion": "爪牙", "Insomniac": "失眠者",
}

# Fields that contain free text eligible for tagging
TEXT_FIELDS = {"speech", "persona", "reason", "quote", "thought", "night_memory_text", "night_memory"}

# Fields that are structural and must NEVER be tagged
STRUCT_FIELDS = {
    "name", "name_zh", "name_en", "player_name", "player_name_zh", "player_name_en",
    "target", "voter", "actor", "vote_target", "player", "winner_team", "outcome",
    "status", "game_id", "type", "timestamp", "phase", "source", "id",
    "seating_order", "center_cards", "initial_role", "current_role", "role",
    "team", "werewolves_in_play", "executed_werewolves", "model", "thinking",
    "speak_count", "duration_seconds", "chat_history", "night_memory_list",
    "log_line",
}


def _load_player_names(game_dir: Path) -> tuple[list[str], dict[str, str]]:
    """
    Load player English names and zh→en mapping from night_result.json.
    Returns (en_names, en_to_zh_map).
    """
    night_path = game_dir / "night_result.json"
    if not night_path.exists():
        return [], {}
    
    night = json.loads(night_path.read_text(encoding="utf-8"))
    en_names = []
    en_to_zh = {}
    
    for _, p in night.get("players", {}).items():
        en_name = p.get("name_en") or p.get("name", "")
        zh_name = p.get("name_zh", "")
        if en_name:
            en_names.append(en_name)
            if zh_name:
                en_to_zh[en_name] = zh_name
    
    return en_names, en_to_zh


def _tag_text(text: str, en_player_names: list[str], is_zh: bool = False) -> str:
    """
    Add <Role> and [Player] tags to free text.
    
    English text: <Seer>, [The Prosecutor]
    Chinese text: <狼人>, [嚴審官]
    """
    if not text or not isinstance(text, str):
        return text
    
    # Don't double-tag: skip if text already has tags
    # (night_phase.py add_memory already uses tags for new games)
    # But we still need to catch untagged mentions
    
    if is_zh:
        # Tag Chinese roles
        for en, zh in sorted(ROLES_ZH.items(), key=lambda x: len(x[1]), reverse=True):
            if f"<{zh}>" not in text:
                # Match whole Chinese term, not inside parentheses
                text = text.replace(zh, f"<{zh}>")
        
        # Tag Chinese player names (from en_to_zh mapping)
        # We need the reverse: zh→en mapping, but for tagging we use zh names
        # Get zh names from the player data
        pass  # Player names handled below for both languages
    
    else:
        # Tag English roles
        for role in sorted(ROLES_EN, key=len, reverse=True):
            # Match whole word, not inside <> or () already
            # Negative lookbehind for < and word char
            # Negative lookahead for > and word char
            pattern = r"(?<![<\w])" + re.escape(role) + r"(?![>\w])"
            replacement = f"<{role}>"
            text = re.sub(pattern, replacement, text)
    
    # Tag English player names (works for both EN text and as fallback in ZH text)
    for name in sorted(en_player_names, key=len, reverse=True):
        if f"[{name}]" not in text:
            pattern = r"(?<![\[\w])" + re.escape(name) + r"(?![\]\w])"
            text = re.sub(pattern, f"[{name}]", text)
    
    return text


def _tag_object(obj: Any, en_player_names: list[str], is_zh: bool = False) -> Any:
    """Recursively walk object and tag text fields."""
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if k in TEXT_FIELDS and isinstance(v, str):
                result[k] = _tag_text(v, en_player_names, is_zh)
            elif k in TEXT_FIELDS and isinstance(v, list):
                result[k] = [_tag_text(item, en_player_names, is_zh) if isinstance(item, str) else item for item in v]
            elif isinstance(v, (dict, list)):
                result[k] = _tag_object(v, en_player_names, is_zh)
            else:
                result[k] = v
        return result
    elif isinstance(obj, list):
        return [_tag_object(v, en_player_names, is_zh) for v in obj]
    return obj


def _tag_zh_players(obj: Any, zh_player_names: list[str]) -> Any:
    """Tag Chinese player names in ZH text fields."""
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if k in TEXT_FIELDS and isinstance(v, str):
                text = v
                for zh_name in sorted(zh_player_names, key=len, reverse=True):
                    if f"[{zh_name}]" not in text:
                        text = text.replace(zh_name, f"[{zh_name}]")
                result[k] = text
            elif isinstance(v, (dict, list)):
                result[k] = _tag_zh_players(v, zh_player_names)
            else:
                result[k] = v
        return result
    elif isinstance(obj, list):
        return [_tag_zh_players(v, zh_player_names) for v in obj]
    return obj


def _get_zh_player_names(game_dir: Path) -> list[str]:
    """Get Chinese player names from night_result.json."""
    night_path = game_dir / "night_result.json"
    if not night_path.exists():
        return []
    night = json.loads(night_path.read_text(encoding="utf-8"))
    return [p.get("name_zh", "") for _, p in night.get("players", {}).items() if p.get("name_zh")]


def run_tag_phase() -> dict[str, Any]:
    """
    Main entry: tag all game data files with <Role> and [Player] markup.
    
    Processes English files first, then derives Chinese player names for ZH files.
    """
    import state_manager
    
    current = state_manager.ensure_current_game()
    game_dir = current["game_dir"]
    game_id = current["game_id"]
    
    # Load player names
    en_player_names, en_to_zh = _load_player_names(game_dir)
    zh_player_names = list(en_to_zh.values())
    
    if not en_player_names:
        return {"status": "skipped", "reason": "no player data found"}
    
    # Process English files
    en_files = [
        "night_result.json", "day_result.json", "vote_result.json",
        "resolve_result.json", "postgame_result.json",
    ]
    
    for fname in en_files:
        path = game_dir / fname
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        tagged = _tag_object(data, en_player_names, is_zh=False)
        path.write_text(json.dumps(tagged, ensure_ascii=False, indent=2), encoding="utf-8")
    
    # Tag chat history
    chat_path = game_dir / "chat_history.md"
    if chat_path.exists():
        lines = chat_path.read_text(encoding="utf-8").splitlines()
        tagged_lines = [_tag_text(line, en_player_names, is_zh=False) for line in lines]
        chat_path.write_text("\n".join(tagged_lines), encoding="utf-8")
    
    # Also tag night_memory_text (it's generated by night_phase.py, not by AI agents)
    # night_phase.py already uses tags in new code, but this catches old-format data
    
    result = {
        "status": "completed",
        "game_id": game_id,
        "player_count": len(en_player_names),
        "roles_count": len(ROLES_EN),
    }
    
    print(f"[tag_phase] Tagged {len(en_player_names)} players, {len(ROLES_EN)} roles in game {game_id}")
    return result


if __name__ == "__main__":
    print(json.dumps(run_tag_phase(), ensure_ascii=False, indent=2))
