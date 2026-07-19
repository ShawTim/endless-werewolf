#!/usr/bin/env python3
"""Repair English/Traditional-Chinese game archives without changing game facts.

The English files are canonical. This script:
1. Repairs accidental Chinese/Cantonese prose in canonical English records.
2. Rebuilds every *_zh.json from the canonical structure.
3. Reuses clean existing Traditional-Chinese prose where possible.
4. Translates missing/corrupt prose with Google Translate (zh-TW).
5. Rebuilds chat histories and mirrors source archives to docs/.
"""

import copy
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT / "data" / "games"
PUBLIC_ROOT = ROOT / "docs" / "data" / "games"

FILES = [
    "night_result.json",
    "day_result.json",
    "vote_result.json",
    "resolve_result.json",
    "postgame_result.json",
]

ROLE_ZH = {
    "Werewolf": "狼人",
    "Seer": "預言家",
    "Robber": "強盜",
    "Troublemaker": "搗蛋鬼",
    "Villager": "村民",
    "Tanner": "皮匠",
    "Minion": "爪牙",
    "Insomniac": "失眠者",
}
PLAYER_ZH = {
    "The Prosecutor": "嚴審官",
    "The Therapist": "心理諮商師",
    "The Chaos Agent": "攪局者",
    "The Gut Player": "直覺俠",
    "The Statistician": "統計學家",
    "The Underdog": "小人物",
}
PLAYER_EN = {value: key for key, value in PLAYER_ZH.items()}

CJK_RE = re.compile(r"[\u3400-\u9fff]")
LATIN_RE = re.compile(r"[A-Za-z]")
LOG_PREFIX_RE = re.compile(r"^\[[^\]]+\]\s+[^:：]+[:：]\s*", re.S)
CANTONESE_RE = re.compile(
    r"(?:我哋|你哋|佢哋|佢|哋|尋晚|琴晚|噚晚|而家|唔|冇|咗|"
    r"嘅|喺|嗰|嚟|啲|咩|噉|咁樣|點解|先至|揸住|真係|係咪|"
    r"係個|邊個|有冇|錯晒|啱到|睇咗|講緊|㗎|喎|啫|囉|畀|"
    r"俾|攞|搵|返嚟|瞓|嘢|仲係|睇下|講咗|唔使|唔知|唔係|"
    r"冇人|邊張|乜嘢|做緊|諗住|等陣)"
)
SIMPLIFIED_TO_TRADITIONAL = str.maketrans({
    "么": "麼", "这": "這", "没": "沒", "样": "樣", "开": "開",
    "说": "說", "话": "話", "诉": "訴", "计": "計", "装": "裝",
    "统": "統", "游": "遊", "来": "來", "换": "換", "扑": "撲",
    "戏": "戲", "对": "對", "学": "學", "后": "後", "变": "變",
    "东": "東", "着": "著",
})
SIMPLIFIED_ONLY_RE = re.compile(
    "[" + re.escape("么这没样开说话诉计装统游来换扑戏对学后变东着") + "]"
)
UNTRANSLATED_LATIN_RE = re.compile(r"[A-Za-z]{2,}")

# Only prose fields are translated. Structural values such as action names,
# roles, player names, targets, IDs, and statuses must remain canonical.
PROSE_KEYS = {
    "persona",
    "night_memory_text",
    "speech",
    "reason",
    "quote",
    "thought",
    "reasoning_summary",
    "error",
}
PROSE_LIST_KEYS = {"night_memory"}

GAME_000009_EN_REPAIRS = {
    2: (
        "Good morning, everyone. Last night I was the <Robber>. I quietly took "
        "[The Underdog]'s card, and I am now the <Seer>. [The Underdog], you "
        "should now be holding my <Robber> card. What role did you start with "
        "last night? When you woke up this morning, did anything feel different? "
        "Take your time—we have time to listen."
    ),
    7: (
        "Listen up, party people. I'm [The Chaos Agent], and I open every game "
        "the same way—by making claims nobody can verify.\n\n"
        "Last night I started as a <Werewolf>. Yes, you heard that right. I "
        "peeked at center card 0. That is not a standard werewolf action, but "
        "this is chaos and I play by my own rules. What did I see? I won't tell "
        "you. Maybe it was the <Tanner>; maybe it was something that flips the "
        "entire game.\n\n"
        "The important part is this: I started as a <Werewolf>, but I am now a "
        "<Villager>. Someone swapped my card during the night. My <Werewolf> "
        "card is now in another player's hand. If someone's claimed role does "
        "not fit their starting position, that person is the wolf.\n\n"
        "Before anyone claims, ask yourself whether the <Troublemaker> or "
        "<Robber> touched my card. One of them may now be holding my <Werewolf> "
        "card without knowing it. I'm not asking you to trust me. I'm asking "
        "you to do the math. Who's first?"
    ),
    10: (
        "[The Gut Player], you say you swapped me with [The Statistician]? I "
        "had to sit with that for a moment. Last night I was the <Robber>. I "
        "robbed [The Underdog], saw that their card was the <Seer>, and I am "
        "now the <Seer>. If you truly swapped me with [The Statistician], I "
        "should be holding [The Statistician]'s card instead. But [The "
        "Underdog] has already confirmed they started as the <Seer>; there "
        "cannot be two <Seer> cards in one game. One part of your story does "
        "not connect. How do you explain it? And if [The Underdog] is telling "
        "the truth, [The Chaos Agent] started as a <Werewolf>. We should slow "
        "down and see whose account actually fits together."
    ),
    13: (
        "[The Underdog] asked a good question, but I never claimed <Seer>. My "
        "claim is that I started as a <Werewolf>, peeked at center card 0, and "
        "saw the <Tanner>. We are describing different actions, so asking why "
        "we both inspected card 0 starts from the wrong premise.\n\n"
        "[The Prosecutor] claims to be the <Troublemaker> and says they swapped "
        "me with [The Statistician]. If that is true, I now hold [The "
        "Statistician]'s original <Villager> card, while [The Statistician] "
        "holds my <Werewolf> card. My role changed, so that swap really "
        "happened.\n\n"
        "[The Underdog] saw me as a <Werewolf> while they were the <Seer>. They "
        "were telling the truth. After the swap, [The Statistician] became the "
        "player holding the <Werewolf> card. That means [The Statistician] is "
        "the wolf now, not me.\n\n"
        "[The Gut Player]'s <Troublemaker> claim is false. There is only one "
        "<Troublemaker>. [The Prosecutor]'s account explains my role change; "
        "[The Gut Player]'s does not.\n\n"
        "But I still prefer watching the show to performing in it. Please, "
        "continue."
    ),
    18: (
        "[The Gut Player], after hearing your challenge, I took a moment to "
        "think. [The Underdog] confirmed they started as the <Seer>; I "
        "personally saw their card, and I now hold the <Seer>. If you swapped "
        "me with [The Statistician], I should no longer be the <Seer>. There "
        "cannot be two <Seer> cards in one game.\n\n"
        "On the other hand, [The Prosecutor] says they swapped [The "
        "Statistician] and [The Chaos Agent]. That aligns perfectly with [The "
        "Underdog] seeing [The Chaos Agent] as a <Werewolf> and [The Chaos "
        "Agent] saying they are now a <Villager>. Three independent accounts "
        "form one coherent picture.\n\n"
        "Your story is the one that does not fit the evidence I personally "
        "observed. We also have two people claiming <Troublemaker>; that is "
        "more than a coincidence.\n\n"
        "I am not going to shout at you. I am simply asking: is it possible you "
        "are misremembering whom you actually swapped?"
    ),
}

GAME_000009_ZH_REPAIRS = {
    2: (
        "大家早安。昨晚我是<強盜>，我悄悄拿走了[小人物]的牌，現在我是<預言家>。"
        "[小人物]，你現在應該拿著我原本的<強盜>牌。我很好奇，你昨晚一開始是什麼"
        "身分？今天早上醒來時，有沒有感覺到任何不同？不用急，慢慢說——我們有時間聽。"
    ),
    7: (
        "聽好了，各位。我是[攪局者]，每場遊戲都用同一種方式開場——提出沒有人能驗證"
        "的說法。\n\n昨晚我一開始是<狼人>。沒錯，你沒有聽錯。我查看了中央第0張牌。"
        "這不是標準的狼人行動，但這裡是混亂的舞台，我有自己的玩法。我看到了什麼？我"
        "不會告訴你。也許是<皮匠>，也許是足以顛覆整場遊戲的東西。\n\n重點是：我一"
        "開始是<狼人>，但現在是<村民>。有人在夜間交換了我的牌。我的<狼人>牌現在"
        "落在另一名玩家手中。如果某人的角色聲明與原本的位置對不上，那個人就是狼人。"
        "\n\n在任何人聲明角色之前，先想想<搗蛋鬼>或<強盜>是否動過我的牌。他們其中"
        "一人可能正拿著我的<狼人>牌，卻毫不知情。我不是要求你相信我，而是要求你算"
        "清楚。誰先來？"
    ),
    10: (
        "[直覺俠]，你說你交換了我和[統計學家]？我需要花一點時間想清楚。昨晚我是"
        "<強盜>，我拿走了[小人物]的牌，親眼看到那張牌是<預言家>，所以我現在是"
        "<預言家>。如果你真的交換了我和[統計學家]，我現在應該拿著[統計學家]的牌"
        "才對。但[小人物]已經確認他們一開始是<預言家>；一場遊戲不可能有兩張"
        "<預言家>牌。你的說法有一部分無法銜接。你要如何解釋？此外，如果[小人物]"
        "說的是實話，[攪局者]一開始就是<狼人>。我們應該先放慢腳步，看看究竟誰的"
        "說法能夠完整吻合。"
    ),
    13: (
        "[小人物]問得很好，但我從未聲稱自己是<預言家>。我的說法是：我一開始是"
        "<狼人>，查看了中央第0張牌，並看到了<皮匠>。我們描述的是不同的行動，因此"
        "質問我們為什麼都查看了第0張牌，本身就建立在錯誤的前提上。\n\n[嚴審官]"
        "聲稱自己是<搗蛋鬼>，並表示交換了我和[統計學家]。如果這是真的，我現在拿著"
        "[統計學家]原本的<村民>牌，而[統計學家]則拿著我的<狼人>牌。我的角色確實"
        "改變了，所以這次交換真的發生過。\n\n[小人物]仍是<預言家>時看到我是"
        "<狼人>，他們沒有說謊。交換之後，拿著<狼人>牌的人變成了[統計學家]。也就"
        "是說，現在的狼人是[統計學家]，不是我。\n\n[直覺俠]的<搗蛋鬼>聲明是假的。"
        "遊戲中只有一張<搗蛋鬼>牌。[嚴審官]的說法能解釋我的角色變化；[直覺俠]的"
        "說法不能。\n\n不過，比起親自演出，我還是更喜歡看戲。各位，請繼續。"
    ),
    18: (
        "[直覺俠]，聽到你的質疑後，我花了一點時間思考。[小人物]確認他們一開始是"
        "<預言家>；我親眼看到那張牌，而現在我手上也是<預言家>。如果你交換了我和"
        "[統計學家]，我現在就不應該仍是<預言家>。一場遊戲不可能有兩張<預言家>牌。"
        "\n\n另一方面，[嚴審官]表示他們交換了[統計學家]和[攪局者]。這與[小人物]"
        "看到[攪局者]是<狼人>，以及[攪局者]表示自己現在是<村民>，完全吻合。三個"
        "獨立說法拼成了一幅一致的圖像。\n\n無法與我親自觀察到的證據吻合的，是你的"
        "故事。現在場上還有兩個人聲稱自己是<搗蛋鬼>；這恐怕不只是巧合。\n\n我不會"
        "對你大吼。我只是想問：你有沒有可能記錯了自己實際交換的是哪兩個人？"
    ),
}


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def get_path(obj: Any, path: tuple[Any, ...]) -> Any:
    current = obj
    for part in path:
        if isinstance(current, dict) and part in current:
            current = current[part]
        elif isinstance(current, list) and isinstance(part, int) and part < len(current):
            current = current[part]
        else:
            return None
    return current


def set_path(obj: Any, path: tuple[Any, ...], value: Any) -> None:
    current = obj
    for part in path[:-1]:
        current = current[part]
    current[path[-1]] = value


def iter_prose(obj: Any, path: tuple[Any, ...] = (), parent_key: str = ""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            child_path = path + (key,)
            if key in PROSE_KEYS and isinstance(value, str) and value.strip():
                yield child_path, key, value
            elif isinstance(value, (dict, list)):
                yield from iter_prose(value, child_path, key)
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            child_path = path + (index,)
            if parent_key in PROSE_LIST_KEYS and isinstance(value, str) and value.strip():
                yield child_path, parent_key, value
            elif isinstance(value, (dict, list)):
                yield from iter_prose(value, child_path, parent_key)


def protect_tokens(text: str, target_language: str) -> tuple[str, dict[str, str]]:
    replacements: dict[str, str] = {}
    counter = 0

    def protect(value: str, replacement: str) -> None:
        nonlocal counter, text
        if value not in text:
            return
        token = f"ZXQKEEP{counter}QXZ"
        counter += 1
        text = text.replace(value, token)
        replacements[token] = replacement

    if target_language == "en":
        for zh, en in PLAYER_EN.items():
            protect(zh, en)
        for en in PLAYER_ZH:
            protect(f"[{en}]", f"[{en}]")
        for role in ROLE_ZH:
            protect(f"<{role}>", f"<{role}>")
    else:
        for en, zh in PLAYER_ZH.items():
            protect(f"[{en}]", f"[{zh}]")
        for en, zh in ROLE_ZH.items():
            protect(f"<{en}>", f"<{zh}>")
        for en, zh in PLAYER_ZH.items():
            protect(en, zh)
        for en, zh in ROLE_ZH.items():
            protect(en, zh)

    return text, replacements


def restore_tokens(text: str, replacements: dict[str, str]) -> str:
    for token, value in replacements.items():
        text = text.replace(token, value)
    return text


class GoogleTranslator:
    def __init__(self):
        self.cache: dict[tuple[str, str, str], str] = {}

    def translate(self, text: str, source: str, target: str) -> str:
        key = (source, target, text)
        if key in self.cache:
            return self.cache[key]

        protected, replacements = protect_tokens(text, target)
        params = urllib.parse.urlencode({
            "client": "gtx",
            "sl": source,
            "tl": target,
            "dt": "t",
            "q": protected,
        }).encode("utf-8")
        request = urllib.request.Request(
            "https://translate.googleapis.com/translate_a/single",
            data=params,
            headers={"User-Agent": "Mozilla/5.0"},
        )

        last_error = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                translated = "".join(
                    part[0] for part in payload[0] if part and part[0]
                ).strip()
                translated = restore_tokens(translated, replacements)
                if translated:
                    self.cache[key] = translated
                    return translated
            except Exception as exc:
                last_error = exc
                time.sleep(1 + attempt)
        raise RuntimeError(f"translation failed after retries: {last_error}")


def normalize_english_prose(text: str, translator: GoogleTranslator) -> str:
    for zh, en in PLAYER_EN.items():
        text = text.replace(zh, en)
    if CJK_RE.search(text):
        text = translator.translate(text, "auto", "en")
    for zh, en in PLAYER_EN.items():
        text = text.replace(zh, en)
    return text


def normalize_chinese_markup(text: str) -> str:
    english_phrases = {
        "Statistician just stood up and said 'I'm a <狼人>, I peeked center card zero, it's <狼人> too.'":
            "統計學家剛剛站起來說：『我是<狼人>，我查看了中央第0張牌，那張也是<狼人>。』",
        "The math ain't complicated: I swapped you, he's the wolf now, we vote him out.":
            "這道推理一點也不複雜：我交換了你們兩人的牌，他現在是狼人，我們把他投出去。",
    }
    for old, new in english_phrases.items():
        text = text.replace(old, new)

    for en, zh in PLAYER_ZH.items():
        text = text.replace(f"[{en}]", f"[{zh}]")
    for en, zh in ROLE_ZH.items():
        text = text.replace(f"<{en}>", f"<{zh}>")
    aliases = {
        "Gut Player": "直覺俠",
        "Chaos Agent": "攪局者",
        "The Prosecutor": "嚴審官",
        "The Therapist": "心理諮商師",
        "The Statistician": "統計學家",
        "The Underdog": "小人物",
        "Prosecutor": "嚴審官",
        "Therapist": "心理諮商師",
        "Statistician": "統計學家",
        "Underdog": "小人物",
        "Stat": "統計學家",
    }
    for old, new in sorted(aliases.items(), key=lambda item: len(item[0]), reverse=True):
        # Do not use ``\b`` here: Unicode CJK characters count as word
        # characters, so contamination such as ``Gut Player聲稱`` has no
        # regex word boundary after the English alias.
        text = text.replace(old, new)
    text = re.sub(r"\bME\b", "我", text)
    for en, zh in ROLE_ZH.items():
        text = re.sub(rf"\b{re.escape(en)}\b", zh, text)
    variants = {
        "坦納": "皮匠",
        "先知": "預言家",
        "麻煩製造者": "搗蛋鬼",
        "失眠症患者": "失眠者",
        "失敗者": "小人物",
        "混亂特工": "攪局者",
    }
    for old, new in variants.items():
        text = text.replace(old, new)
    # Normalize accidental Simplified Chinese fragments that occasionally
    # survive zh-TW translation responses.
    return text.translate(SIMPLIFIED_TO_TRADITIONAL)


def clean_existing_zh(text: Any, key: str) -> bool:
    if not isinstance(text, str) or not text.strip():
        return False
    if CANTONESE_RE.search(text):
        return False
    if SIMPLIFIED_ONLY_RE.search(text):
        return False
    # Mathematical P(...) notation is permitted. Other multi-letter Latin
    # fragments indicate untranslated names or sentences in localized prose.
    latin_check = re.sub(r"\bP(?=\s*\()", "", text)
    if UNTRANSLATED_LATIN_RE.search(latin_check):
        return False
    if key == "speech" and LOG_PREFIX_RE.search(text):
        return False
    cjk = len(CJK_RE.findall(text))
    latin = len(LATIN_RE.findall(text))
    return cjk >= 2 and cjk >= latin * 0.4


def rebuild_log_lines(day: dict[str, Any], chinese: bool) -> None:
    lines = []
    for event in day.get("day_trace", []):
        if event.get("type") != "speech":
            continue
        speaker = event.get("player_name", "")
        target = event.get("target", "")
        if chinese:
            speaker = PLAYER_ZH.get(speaker, speaker)
            target = PLAYER_ZH.get(target, target)
        timestamp = event.get("timestamp", "")
        prefix = f"[{timestamp}] " if timestamp else ""
        target_part = f" @{target}" if target else ""
        line = f"{prefix}{speaker}{target_part}: {event.get('speech', '')}"
        event["log_line"] = line
        lines.append(line)
    day["chat_history"] = "\n".join(lines) + ("\n" if lines else "")


def repair_english_game(game_dir: Path, translator: GoogleTranslator) -> dict[str, dict]:
    payloads: dict[str, dict] = {}
    for filename in FILES:
        path = game_dir / filename
        if not path.exists():
            continue
        payload = load_json(path)
        changed = False
        for path_parts, _, value in list(iter_prose(payload)):
            repaired = normalize_english_prose(value, translator)
            if repaired != value:
                set_path(payload, path_parts, repaired)
                changed = True
        if filename == "day_result.json":
            if game_dir.name == "game_000009":
                for index, speech in GAME_000009_EN_REPAIRS.items():
                    if payload["day_trace"][index].get("speech") != speech:
                        payload["day_trace"][index]["speech"] = speech
                        changed = True
            if changed:
                rebuild_log_lines(payload, chinese=False)
        if changed:
            write_json(path, payload)
        payloads[filename] = payload
    return payloads


def rebuild_chinese_game(
    game_dir: Path,
    english_payloads: dict[str, dict],
    translator: GoogleTranslator,
) -> None:
    for filename, english in english_payloads.items():
        zh_filename = filename.replace(".json", "_zh.json")
        zh_path = game_dir / zh_filename
        existing = load_json(zh_path) if zh_path.exists() else {}
        rebuilt = copy.deepcopy(english)

        for path_parts, key, english_text in list(iter_prose(english)):
            if (
                game_dir.name == "game_000009"
                and filename == "day_result.json"
                and len(path_parts) == 3
                and path_parts[0] == "day_trace"
                and path_parts[2] == "speech"
                and path_parts[1] in GAME_000009_ZH_REPAIRS
            ):
                translated = GAME_000009_ZH_REPAIRS[path_parts[1]]
                set_path(rebuilt, path_parts, translated)
                continue
            existing_text = get_path(existing, path_parts)
            normalized_existing = (
                normalize_chinese_markup(existing_text)
                if isinstance(existing_text, str)
                else existing_text
            )
            if clean_existing_zh(normalized_existing, key):
                translated = normalized_existing
            else:
                translated = translator.translate(english_text, "en", "zh-TW")
            translated = normalize_chinese_markup(translated)
            if CANTONESE_RE.search(translated):
                translated = translator.translate(english_text, "en", "zh-TW")
                translated = normalize_chinese_markup(translated)
            set_path(rebuilt, path_parts, translated)

        if filename == "day_result.json":
            rebuild_log_lines(rebuilt, chinese=True)
        write_json(zh_path, rebuilt)

    day_en = english_payloads.get("day_result.json", {})
    day_zh = load_json(game_dir / "day_result_zh.json")
    (game_dir / "chat_history.md").write_text(
        day_en.get("chat_history", ""), encoding="utf-8"
    )
    (game_dir / "chat_history_zh.md").write_text(
        day_zh.get("chat_history", ""), encoding="utf-8"
    )


def mirror_public_game(game_dir: Path) -> None:
    public_dir = PUBLIC_ROOT / game_dir.name
    public_dir.mkdir(parents=True, exist_ok=True)
    for path in game_dir.iterdir():
        if path.is_file() and (
            path.name in FILES
            or path.name.replace("_zh.json", ".json") in FILES
            or path.name in {"chat_history.md", "chat_history_zh.md"}
        ):
            (public_dir / path.name).write_bytes(path.read_bytes())


def main() -> None:
    translator = GoogleTranslator()
    games = sorted(path for path in SOURCE_ROOT.glob("game_*") if path.is_dir())
    for game_dir in games:
        print(f"[repair] {game_dir.name}")
        english = repair_english_game(game_dir, translator)
        rebuild_chinese_game(game_dir, english, translator)
        mirror_public_game(game_dir)
    print(f"[repair] completed {len(games)} games; translations={len(translator.cache)}")


if __name__ == "__main__":
    main()
