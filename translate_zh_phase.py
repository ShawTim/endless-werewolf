"""
Translate game data from English to Traditional Chinese (正體中文書面語).
Uses an LLM bridge agent for high-quality, context-aware translation that preserves character voices.

Pipeline step: runs after translate_phase (en), before build_pages.
Produces *_zh.json and chat_history_zh.md alongside originals.
"""

import json
import re
import subprocess
from pathlib import Path
from typing import Any

import state_manager
from scripts.audit_all_games import (
    CANTONESE_RE,
    SIMPLIFIED_ONLY_RE,
    UNTRANSLATED_LATIN_RE,
)

WORKSPACE = Path(__file__).resolve().parent

# Import role/player mappings from tag_phase for deterministic translation
try:
    from tag_phase import ROLES_EN, ROLES_ZH
except ImportError:
    ROLES_EN = ["Werewolf", "Seer", "Robber", "Troublemaker", "Villager", "Tanner", "Minion", "Insomniac"]
    ROLES_ZH = {
        "Werewolf": "狼人", "Seer": "預言家", "Robber": "強盜",
        "Troublemaker": "搗蛋鬼", "Villager": "村民",
        "Tanner": "皮匠", "Minion": "爪牙", "Insomniac": "失眠者",
    }

# Fields that contain translatable prose. Structural fields such as action,
# role, target, status, and IDs must remain canonical across languages.
TRANSLATABLE_KEYS = {
    "persona", "night_memory_text", "speech", "reason", "quote",
    "thought", "reasoning", "reasoning_summary", "error",
}
TRANSLATABLE_LIST_KEYS = {"night_memory"}

# Player name fields to skip (frontend handles localization)
SKIP_KEYS = {"name", "name_en", "name_zh", "player_name", "player_name_zh", "player_name_en", "target", "actor", "voter"}
CJK_RE = re.compile(r"[\u3400-\u9FFF]")

def _pre_translate_tags(text: str, en_to_zh_players: dict[str, str]) -> str:
    """
    Deterministically translate <Role> and [Player] tags BEFORE sending to the LLM.
    This guarantees consistent role/player name translation.
    """
    if not text:
        return text
    
    # Replace <EnglishRole> -> <ChineseRole>
    for en, zh in ROLES_ZH.items():
        text = text.replace(f"<{en}>", f"<{zh}>")
    
    # Replace [EnglishPlayer] -> [ChinesePlayer]
    for en, zh in en_to_zh_players.items():
        text = text.replace(f"[{en}]", f"[{zh}]")
    
    return text


def _needs_translation(key: str, value: Any) -> bool:
    """Check if this field should be translated."""
    if not isinstance(value, str) or not value.strip():
        return False
    if key in SKIP_KEYS:
        return False
    # Canonical source records are English. Always translate known prose fields
    # in full; never reuse a "mostly Chinese" value because mixed-language
    # fragments were able to pass through that shortcut.
    return key in TRANSLATABLE_KEYS


def _build_translation_prompt(items: list[tuple[str, str]]) -> str:
    """Build a batch translation prompt for the LLM."""
    lines = []
    lines.append("You are a professional translator. Translate the following English texts to Traditional Chinese (正體中文書面語 - proper written Chinese, NOT Cantonese).")
    lines.append("")
    lines.append("Rules:")
    lines.append("- Use 正體中文書面語 (formal written Traditional Chinese)")
    lines.append("- Do NOT use Cantonese colloquial forms (no 嘅, 喺, 咩, 我哋, etc.)")
    lines.append("- Use 我們 instead of 我哋, 的 instead of 嘅, 在 instead of 喺")
    lines.append("- Preserve character personalities: formal/legal for prosecutor, gentle for therapist, dramatic for chaos agent, blunt for gut player, academic for statistician, nervous for underdog")
    lines.append("- Preserve markup exactly:")
    lines.append("  <Role> = game role (translate inside): <Werewolf> -> <狼人>, <Seer> -> <預言家>")
    lines.append("    <Robber> -> <強盜>, <Troublemaker> -> <搗蛋鬼>, <Villager> -> <村民>")
    lines.append("    <Tanner> -> <皮匠>, <Minion> -> <爪牙>, <Insomniac> -> <失眠者>")
    lines.append("  [Player] = player name (translate inside): [The Prosecutor] -> [嚴審官]")
    lines.append("    [The Therapist] -> [心理諮商師], [The Chaos Agent] -> [攪局者]")
    lines.append("    [The Gut Player] -> [直覺俠], [The Statistician] -> [統計學家]")
    lines.append("    [The Underdog] -> [小人物]")
    lines.append("- Keep < > for roles and [ ] for player names. Do NOT swap or remove them.")
    lines.append("")
    lines.append("Return ONLY a JSON array of translated strings, same order as input. No explanation.")
    lines.append("")
    lines.append(f"Texts to translate ({len(items)} items):")
    lines.append("")
    for i, (key, text) in enumerate(items):
        lines.append(f"[{i}] ({key}): {json.dumps(text, ensure_ascii=False)}")
    lines.append("")
    lines.append("Return format: [\"翻譯1\", \"翻譯2\", ...]")

    return "\n".join(lines)


def _call_translator(prompt: str) -> str:
    """Call LLM via openclaw bridge agent for translation."""
    import uuid
    try:
        proc = subprocess.run(
            ["openclaw", "agent",
             "--agent", "ai_werewolf_bridge",
             "--message", prompt,
             "--json",
             "--model", "deepseek-flash",
             "--thinking", "off",
             "--session-id", str(uuid.uuid4())],
            cwd=str(WORKSPACE),
            capture_output=True, text=True, check=False,
            timeout=240,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"LLM call failed: {proc.stderr.strip()[:300]}")

        resp = json.loads(proc.stdout)
        result = ((resp or {}).get("result") or {}).get("payloads") or []
        if not result:
            raise RuntimeError(f"No payloads in response: {proc.stdout[:300]}")

        text = (result[0].get("text") or "").strip()
        return text
    except Exception as e:
        print(f"[translate_zh] LLM call error: {e}")
        return ""


def _parse_llm_response(text: str, expected_count: int) -> list[str]:
    """Parse the JSON array from LLM response."""
    text = text.strip()
    # Try direct JSON parse
    try:
        arr = json.loads(text)
        if isinstance(arr, list) and len(arr) == expected_count:
            return [str(x) for x in arr]
    except json.JSONDecodeError:
        pass

    # Try to extract JSON array from text
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end > start:
        try:
            arr = json.loads(text[start:end + 1])
            if isinstance(arr, list) and len(arr) == expected_count:
                return [str(x) for x in arr]
        except json.JSONDecodeError:
            pass

    return []


def _validate_chinese_translation(text: str, source_text: str) -> None:
    if not text:
        raise RuntimeError(f"Chinese translation is empty: {source_text[:120]}")
    if not CJK_RE.search(text):
        raise RuntimeError(f"Chinese translation contains no Chinese text: {source_text[:120]}")
    if CANTONESE_RE.search(text):
        raise RuntimeError(f"Chinese translation contains Cantonese: {text[:120]}")
    if SIMPLIFIED_ONLY_RE.search(text):
        raise RuntimeError(f"Chinese translation contains Simplified Chinese: {text[:120]}")
    latin_check = re.sub(r"\bP(?=\s*\()", "", text)
    if UNTRANSLATED_LATIN_RE.search(latin_check):
        raise RuntimeError(f"Chinese translation contains untranslated Latin text: {text[:120]}")


def _translate_batch(items: list[tuple[str, str]]) -> list[str]:
    """Translate a batch of texts using the LLM."""
    if not items:
        return []

    # Preserve complete speeches. Batches are bounded by both item count and
    # source characters instead of truncating individual records.
    BATCH_SIZE = 8
    MAX_BATCH_CHARS = 12000
    results = []
    batches = []
    batch = []
    batch_chars = 0
    for item in items:
        item_chars = len(item[1])
        if batch and (len(batch) >= BATCH_SIZE or batch_chars + item_chars > MAX_BATCH_CHARS):
            batches.append(batch)
            batch = []
            batch_chars = 0
        batch.append(item)
        batch_chars += item_chars
    if batch:
        batches.append(batch)

    for batch in batches:
        prompt = _build_translation_prompt(batch)
        response = _call_translator(prompt)
        translations = _parse_llm_response(response, len(batch))
        if len(translations) != len(batch):
            raise RuntimeError(
                f"Chinese translation returned {len(translations)} items; "
                f"expected {len(batch)}"
            )

        # Never leak English, Cantonese, or Simplified source prose into a
        # Traditional-Chinese archive.
        for j, (key, orig) in enumerate(batch):
            _validate_chinese_translation(translations[j], orig)

        results.extend(translations)

    return results


def _collect_translatable(
    obj: Any,
    path: str = "",
    parent_key: str = "",
) -> list[tuple[str, str, Any, Any]]:
    """
    Walk the object tree and collect (key, text, parent_ref) for all translatable strings.
    Returns list of (key, text, setter_info) where setter_info helps us update the value.
    """
    items = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if _needs_translation(k, v):
                items.append((k, v, obj, k))
            elif isinstance(v, (dict, list)):
                items.extend(_collect_translatable(v, f"{path}.{k}", k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, str) and parent_key in TRANSLATABLE_LIST_KEYS and v.strip():
                items.append((parent_key, v, obj, i))
            elif isinstance(v, (dict, list)):
                items.extend(_collect_translatable(v, f"{path}[{i}]", parent_key))
    return items


def _apply_translations(
    obj: Any,
    translations: dict[str, str],
    parent_key: str = "",
) -> Any:
    """Apply translations to an object, matching by path."""
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if k in TRANSLATABLE_KEYS and isinstance(v, str) and v in translations:
                result[k] = translations[v]
            elif isinstance(v, (dict, list)):
                result[k] = _apply_translations(v, translations, k)
            else:
                result[k] = v
        return result
    if isinstance(obj, list):
        return [
            translations.get(v, v)
            if isinstance(v, str) and parent_key in TRANSLATABLE_LIST_KEYS
            else _apply_translations(v, translations, parent_key)
            if isinstance(v, (dict, list))
            else v
            for v in obj
        ]
    return obj


def _rebuild_chinese_day_log(
    day: dict[str, Any],
    en_to_zh_players: dict[str, str],
) -> None:
    lines = []
    for event in day.get("day_trace", []):
        if event.get("type") != "speech":
            event.pop("log_line", None)
            continue
        speaker = en_to_zh_players.get(event.get("player_name", ""), event.get("player_name", ""))
        target = en_to_zh_players.get(event.get("target", ""), event.get("target", ""))
        timestamp = event.get("timestamp", "")
        prefix = f"[{timestamp}] " if timestamp else ""
        target_part = f" @{target}" if target else ""
        line = f"{prefix}{speaker}{target_part}: {event.get('speech', '')}"
        event["log_line"] = line
        lines.append(line)
    day["chat_history"] = "\n".join(lines) + ("\n" if lines else "")


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run_translate_zh_phase() -> dict[str, Any]:
    """Main entry: translate all game data to Chinese."""
    current = state_manager.ensure_current_game()
    game_dir = current["game_dir"]

    files = {
        "night": game_dir / "night_result.json",
        "day": game_dir / "day_result.json",
        "vote": game_dir / "vote_result.json",
        "resolve": game_dir / "resolve_result.json",
        "postgame": game_dir / "postgame_result.json",
    }

    # Collect all translatable texts across all files
    all_texts: dict[str, str] = {}  # original -> original (dedup)
    file_data: dict[str, Any] = {}

    for key, src in files.items():
        if not src.exists():
            continue
        payload = _load_json(src)
        file_data[key] = payload

        items = _collect_translatable(payload)
        for _, text, _, _ in items:
            if text and text not in all_texts:
                all_texts[text] = text

    # Load player name mapping (en→zh) for deterministic tag translation
    en_to_zh_players = {}
    night_data = file_data.get("night", {})
    for _, p in night_data.get("players", {}).items():
        en = p.get("name_en") or p.get("name", "")
        zh = p.get("name_zh", "")
        if en and zh:
            en_to_zh_players[en] = zh

    # Translate all unique texts
    unique_items = list(all_texts.values())
    print(f"[translate_zh] Translating {len(unique_items)} unique texts...")

    # Pre-translate tags deterministically BEFORE LLM
    # This ensures <Seer> always becomes <預言家>, never <先知>
    pre_translated = {}
    for orig in unique_items:
        pre_translated[orig] = _pre_translate_tags(orig, en_to_zh_players)

    # Send to LLM for prose translation (tags already in Chinese)
    batch_items = [("text", pre_translated[t]) for t in unique_items]
    translated_texts = _translate_batch(batch_items)

    # Build translation map: original EN text -> final ZH text
    translation_map: dict[str, str] = {}
    for orig, translated in zip(unique_items, translated_texts):
        translation_map[orig] = translated

    # Apply translations and write _zh files
    output_files: dict[str, str] = {}
    for key, src in files.items():
        if key not in file_data:
            continue
        translated_obj = _apply_translations(file_data[key], translation_map)
        if key == "day":
            _rebuild_chinese_day_log(translated_obj, en_to_zh_players)
        dst = game_dir / f"{src.stem}_zh.json"
        _write_json(dst, translated_obj)
        output_files[key] = str(dst)

    # The localized Markdown transcript is derived from the translated Day
    # record, so it cannot drift from the UI's canonical discussion data.
    translated_day = game_dir / "day_result_zh.json"
    if translated_day.exists():
        day_payload = _load_json(translated_day)
        chat_dst = game_dir / "chat_history_zh.md"
        chat_dst.write_text(day_payload.get("chat_history", ""), encoding="utf-8")
        output_files["chat"] = str(chat_dst)

    print(f"[translate_zh] Done. {len(translation_map)} texts translated.")

    return {
        "status": "completed",
        "game_id": current["game_id"],
        "translated_files": output_files,
        "text_count": len(translation_map),
    }


if __name__ == "__main__":
    print(json.dumps(run_translate_zh_phase(), ensure_ascii=False, indent=2))
