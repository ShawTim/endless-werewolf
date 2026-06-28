"""
Translate game data from English to Traditional Chinese (正體中文書面語).
Uses Gemini for high-quality, context-aware translation that preserves character voices.

Pipeline step: runs after translate_phase (en), before build_pages.
Produces *_zh.json and chat_history_zh.md alongside originals.
"""

import json
import re
import subprocess
from pathlib import Path
from typing import Any

import state_manager

WORKSPACE = Path(__file__).resolve().parent

# Fields that contain translatable prose
TRANSLATABLE_KEYS = {"persona", "speech", "reason", "quote", "action"}

# Player name fields to skip (frontend handles localization)
SKIP_KEYS = {"name", "name_en", "name_zh", "player_name", "target", "actor", "voter"}


def _needs_translation(key: str, value: Any) -> bool:
    """Check if this field should be translated."""
    if not isinstance(value, str) or not value.strip():
        return False
    if key in SKIP_KEYS:
        return False
    # Skip if already mostly Chinese
    cjk_count = len(re.findall(r"[\u3400-\u9FFF]", value))
    if cjk_count > len(value) * 0.3:
        return False
    # Translate persona, speech, reason, quote, action fields
    if key in TRANSLATABLE_KEYS:
        return True
    # Also translate free-text fields that look like English prose
    if key not in SKIP_KEYS and len(value) > 20 and re.search(r"[a-zA-Z]", value):
        # Heuristic: if it's a long string with English letters, translate it
        return True
    return False


def _build_translation_prompt(items: list[tuple[str, str]]) -> str:
    """Build a batch translation prompt for Gemini."""
    lines = []
    lines.append("You are a professional translator. Translate the following English texts to Traditional Chinese (正體中文書面語 - proper written Chinese, NOT Cantonese).")
    lines.append("")
    lines.append("Rules:")
    lines.append("- Use 正體中文書面語 (formal written Traditional Chinese)")
    lines.append("- Do NOT use Cantonese colloquial forms (no 嘅, 喺, 咩, 我哋, etc.)")
    lines.append("- Use 我們 instead of 我哋, 的 instead of 嘅, 在 instead of 喺")
    lines.append("- Preserve character personalities: formal/legal for prosecutor, gentle for therapist, dramatic for chaos agent, blunt for gut player, academic for statistician, nervous for underdog")
    lines.append("- Keep [ ] brackets around role and player names. Translate the content inside brackets:")
    lines.append("  [Werewolf] -> [狼人], [Seer] -> [預言家], [Robber] -> [強盜]")
    lines.append("  [Troublemaker] -> [搗蛋鬼], [Villager] -> [村民], [Tanner] -> [皮匠]")
    lines.append("  [Minion] -> [爪牙], [Insomniac] -> [失眠者]")
    lines.append("  [The Prosecutor] -> [嚴審官], [The Therapist] -> [心理諮商師]")
    lines.append("  [The Chaos Agent] -> [攪局者], [The Gut Player] -> [直覺俠]")
    lines.append("  [The Statistician] -> [統計學家], [The Underdog] -> [小人物]")
    lines.append("- Do NOT remove or add brackets. Preserve [ ] format exactly.")
    lines.append("- Text outside brackets is normal prose, translate normally")
    lines.append("")
    lines.append("Return ONLY a JSON array of translated strings, same order as input. No explanation.")
    lines.append("")
    lines.append(f"Texts to translate ({len(items)} items):")
    lines.append("")
    for i, (key, text) in enumerate(items):
        # Truncate very long texts to fit context limits
        truncated = text[:2000] if len(text) > 2000 else text
        lines.append(f"[{i}] ({key}): {json.dumps(truncated, ensure_ascii=False)}")
    lines.append("")
    lines.append("Return format: [\"翻譯1\", \"翻譯2\", ...]")

    return "\n".join(lines)


def _call_gemini(prompt: str) -> str:
    """Call Gemini via openclaw agent for translation."""
    try:
        proc = subprocess.run(
            ["openclaw", "agent",
             "--agent", "ai_werewolf_bridge",
             "--message", prompt,
             "--json",
             "--model", "aistudio/gemini-3.1-pro-preview",
             "--thinking", "low"],
            cwd=str(WORKSPACE),
            capture_output=True, text=True, check=False,
            timeout=120,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"Gemini call failed: {proc.stderr.strip()[:300]}")

        resp = json.loads(proc.stdout)
        result = ((resp or {}).get("result") or {}).get("payloads") or []
        if not result:
            raise RuntimeError(f"No payloads in response: {proc.stdout[:300]}")

        text = (result[0].get("text") or "").strip()
        return text
    except Exception as e:
        print(f"[translate_zh] Gemini call error: {e}")
        return ""


def _parse_gemini_response(text: str, expected_count: int) -> list[str]:
    """Parse the JSON array from Gemini response."""
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
            if isinstance(arr, list):
                # Pad or truncate to expected count
                while len(arr) < expected_count:
                    arr.append("")
                return [str(x) for x in arr[:expected_count]]
        except json.JSONDecodeError:
            pass

    # Fallback: return empty strings
    return [""] * expected_count


def _translate_batch(items: list[tuple[str, str]]) -> list[str]:
    """Translate a batch of texts using Gemini."""
    if not items:
        return []

    # Process in chunks of 20 to keep prompt manageable
    BATCH_SIZE = 20
    results = []
    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i:i + BATCH_SIZE]
        prompt = _build_translation_prompt(batch)
        response = _call_gemini(prompt)
        translations = _parse_gemini_response(response, len(batch))

        # Fallback: if translation failed, keep original
        for j, (key, orig) in enumerate(batch):
            if not translations[j]:
                translations[j] = orig

        results.extend(translations)

    return results


def _collect_translatable(obj: Any, path: str = "") -> list[tuple[str, str, Any]]:
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
                items.extend(_collect_translatable(v, f"{path}.{k}"))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, (dict, list)):
                items.extend(_collect_translatable(v, f"{path}[{i}]"))
    return items


def _apply_translations(obj: Any, translations: dict[str, str]) -> Any:
    """Apply translations to an object, matching by path."""
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if k in TRANSLATABLE_KEYS and isinstance(v, str) and v in translations:
                result[k] = translations[v]
            elif isinstance(v, (dict, list)):
                result[k] = _apply_translations(v, translations)
            else:
                result[k] = v
        return result
    if isinstance(obj, list):
        return [_apply_translations(v, translations) for v in obj]
    return obj


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

    # Also collect chat history lines
    chat_src = game_dir / "chat_history.md"
    chat_lines = []
    if chat_src.exists():
        chat_lines = chat_src.read_text(encoding="utf-8").splitlines()
        for line in chat_lines:
            # Only translate lines with English content (skip timestamps-only lines)
            stripped = line.strip()
            if stripped and len(stripped) > 30 and re.search(r"[a-zA-Z]{5,}", stripped):
                if stripped not in all_texts:
                    all_texts[stripped] = stripped

    # Translate all unique texts
    unique_items = list(all_texts.values())
    print(f"[translate_zh] Translating {len(unique_items)} unique texts...")

    batch_items = [("text", t) for t in unique_items]
    translated_texts = _translate_batch(batch_items)

    # Build translation map
    translation_map: dict[str, str] = {}
    for orig, translated in zip(unique_items, translated_texts):
        translation_map[orig] = translated

    # Apply translations and write _zh files
    output_files: dict[str, str] = {}
    for key, src in files.items():
        if key not in file_data:
            continue
        translated_obj = _apply_translations(file_data[key], translation_map)
        dst = game_dir / f"{src.stem}_zh.json"
        _write_json(dst, translated_obj)
        output_files[key] = str(dst)

    # Translate and write chat history
    if chat_lines:
        translated_chat = []
        for line in chat_lines:
            stripped = line.strip()
            if stripped in translation_map:
                translated_chat.append(translation_map[stripped])
            else:
                translated_chat.append(line)
        chat_dst = game_dir / "chat_history_zh.md"
        chat_dst.write_text("\n".join(translated_chat), encoding="utf-8")
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