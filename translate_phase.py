import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

import state_manager

WORKSPACE = Path(__file__).resolve().parent
STATE_DIR = WORKSPACE / "data" / "state"

CJK_RE = re.compile(r"[\u3400-\u9FFF]")
TRANSLATE_API = "https://translate.googleapis.com/translate_a/single"


class Translator:
    def __init__(self, source_lang: str = "zh-TW", target_lang: str = "en"):
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.cache: dict[str, str] = {}

    def needs_translation(self, text: str) -> bool:
        return bool(CJK_RE.search(text))

    def translate_text(self, text: str) -> str:
        text = text or ""
        if not text.strip() or not self.needs_translation(text):
            return text
        if text in self.cache:
            return self.cache[text]

        params = {
            "client": "gtx",
            "sl": self.source_lang,
            "tl": self.target_lang,
            "dt": "t",
            "q": text,
        }
        url = TRANSLATE_API + "?" + urllib.parse.urlencode(params)

        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            translated = "".join(part[0] for part in payload[0] if part and part[0])
            translated = translated.strip() or text
        except Exception:
            translated = text

        self.cache[text] = translated
        return translated

    def translate_object(self, obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k: self.translate_object(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self.translate_object(v) for v in obj]
        if isinstance(obj, str):
            return self.translate_text(obj)
        return obj


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run_translate_phase() -> dict[str, Any]:
    current = state_manager.ensure_current_game()
    game_dir = current["game_dir"]

    translator = Translator(source_lang="zh-TW", target_lang="en")

    files = {
        "night": game_dir / "night_result.json",
        "day": game_dir / "day_result.json",
        "vote": game_dir / "vote_result.json",
        "resolve": game_dir / "resolve_result.json",
        "postgame": game_dir / "postgame_result.json",
    }

    output_files: dict[str, str] = {}
    for key, src in files.items():
        if not src.exists():
            continue
        payload = _load_json(src)
        translated = translator.translate_object(payload)
        dst = game_dir / f"{src.stem}_en.json"
        _write_json(dst, translated)
        output_files[key] = str(dst)

    chat_src = game_dir / "chat_history.md"
    if chat_src.exists():
        chat_text = chat_src.read_text(encoding="utf-8")
        chat_en = translator.translate_text(chat_text)
        chat_dst = game_dir / "chat_history_en.md"
        chat_dst.write_text(chat_en, encoding="utf-8")
        output_files["chat"] = str(chat_dst)

    # legacy compatibility output (latest game only)
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    for name in ["night_result_en.json", "day_result_en.json", "vote_result_en.json", "resolve_result_en.json", "postgame_result_en.json", "chat_history_en.md"]:
        src = game_dir / name
        if src.exists():
            (STATE_DIR / name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    state_manager.mark_phase(game_dir, "translate", "chat_history_en.md")

    return {
        "status": "completed",
        "game_id": current["game_id"],
        "translated_files": output_files,
        "cache_size": len(translator.cache),
    }


if __name__ == "__main__":
    print(json.dumps(run_translate_phase(), ensure_ascii=False, indent=2))
