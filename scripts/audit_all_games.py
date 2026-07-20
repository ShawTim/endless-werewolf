#!/usr/bin/env python3
"""Audit every source and published Endless Werewolf game archive."""

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT / "data" / "games"
PUBLIC_ROOT = ROOT / "docs" / "data" / "games"
INDEX_PATH = ROOT / "docs" / "data" / "index.json"

BASE_FILES = [
    "manifest.json",
    "night_result.json",
    "day_result.json",
    "vote_result.json",
    "resolve_result.json",
    "postgame_result.json",
]
ZH_FILES = [name.replace(".json", "_zh.json") for name in BASE_FILES[1:]]
ALLOWED_ROLES = {
    "Werewolf", "Seer", "Robber", "Troublemaker", "Villager",
    "Tanner", "Minion", "Insomniac",
}
CJK_RE = re.compile(r"[\u3400-\u9fff]")
LATIN_RE = re.compile(r"[A-Za-z]")
CANTONESE_RE = re.compile(
    r"(?:我哋|你哋|佢哋|佢|哋|尋晚|琴晚|噚晚|而家|唔|冇|咗|"
    r"嘅|喺|嗰|嚟|啲|咩|噉|咁樣|點解|先至|揸住|真係|係咪|"
    r"係個|邊個|有冇|錯晒|啱到|睇咗|講緊|㗎|喎|啫|囉|畀|"
    r"俾|攞|搵|返嚟|瞓|嘢|仲係|睇下|講咗|唔使|唔知|唔係|"
    r"冇人|邊張|乜嘢|做緊|諗住|等陣)"
)
SIMPLIFIED_ONLY_RE = re.compile(
    "[" + re.escape("么这没样开说话诉计装统游来换扑戏对学后变东着") + "]"
)
UNTRANSLATED_LATIN_RE = re.compile(r"[A-Za-z]{2,}")
LOG_PREFIX_RE = re.compile(r"^\[[^\]]+\]\s+[^:：]+[:：]\s*")
PROSE_KEYS = {
    "persona", "night_memory_text", "speech", "reason", "quote",
    "thought", "reasoning", "reasoning_summary", "error", "chat_history",
    "log_line",
}
PROSE_LIST_KEYS = {"night_memory"}


def load_json(path, errors):
    if not path.exists():
        errors.append("missing %s" % path.name)
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append("invalid JSON %s: %s" % (path.name, exc))
        return {}


def team_of(role):
    if role in {"Werewolf", "Minion"}:
        return "werewolf_team"
    if role == "Tanner":
        return "tanner"
    return "village_team"


def expected_resolution(night, vote):
    players = list((night.get("players") or {}).values())
    by_name = {p.get("name"): p for p in players}
    executed = vote.get("executed") or []
    tanners = [n for n in executed if by_name.get(n, {}).get("current_role") == "Tanner"]
    wolves = [p.get("name") for p in players if p.get("current_role") == "Werewolf"]
    executed_wolves = [n for n in executed if n in wolves]
    if tanners:
        return "tanner_win", "tanner", sorted(tanners)
    if wolves:
        if executed_wolves:
            winners = [p.get("name") for p in players if team_of(p.get("current_role")) == "village_team"]
            return "village_win", "village_team", sorted(winners)
        winners = [p.get("name") for p in players if team_of(p.get("current_role")) == "werewolf_team"]
        return "werewolf_win", "werewolf_team", sorted(winners)
    if not executed:
        winners = [p.get("name") for p in players if team_of(p.get("current_role")) == "village_team"]
        return "village_win_no_wolf", "village_team", sorted(winners)
    return "no_team_win", "none", []


def iter_prose(obj, path="", parent_key=""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            child_path = "%s.%s" % (path, key) if path else key
            if key in PROSE_KEYS and isinstance(value, str) and value.strip():
                yield child_path, key, value
            elif isinstance(value, (dict, list)):
                yield from iter_prose(value, child_path, key)
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            child_path = "%s[%d]" % (path, index)
            if parent_key in PROSE_LIST_KEYS and isinstance(value, str) and value.strip():
                yield child_path, parent_key, value
            elif isinstance(value, (dict, list)):
                yield from iter_prose(value, child_path, parent_key)


def iter_strings(obj, path=""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            child_path = "%s.%s" % (path, key) if path else key
            if isinstance(value, str):
                yield child_path, key, value
            elif isinstance(value, (dict, list)):
                yield from iter_strings(value, child_path)
    elif isinstance(obj, list):
        for index, value in enumerate(obj):
            child_path = "%s[%d]" % (path, index)
            if isinstance(value, str):
                yield child_path, "", value
            elif isinstance(value, (dict, list)):
                yield from iter_strings(value, child_path)


def audit_language(payloads, errors):
    pairs = [
        ("night_result.json", "night_result_zh.json"),
        ("day_result.json", "day_result_zh.json"),
        ("vote_result.json", "vote_result_zh.json"),
        ("resolve_result.json", "resolve_result_zh.json"),
        ("postgame_result.json", "postgame_result_zh.json"),
    ]
    for en_name, zh_name in pairs:
        for path, _, text in iter_prose(payloads.get(en_name, {})):
            if CJK_RE.search(text):
                errors.append("%s %s contains Chinese text" % (en_name, path))
        for path, key, text in iter_prose(payloads.get(zh_name, {})):
            cjk_count = len(CJK_RE.findall(text))
            latin_count = len(LATIN_RE.findall(text))
            if cjk_count < 2 or cjk_count < latin_count * 0.25:
                errors.append("%s %s is not Chinese prose" % (zh_name, path))
            if CANTONESE_RE.search(text):
                errors.append("%s %s contains Cantonese" % (zh_name, path))
            if SIMPLIFIED_ONLY_RE.search(text):
                errors.append("%s %s contains Simplified Chinese" % (zh_name, path))
            latin_check = re.sub(r"\bP(?=\s*\()", "", text)
            if UNTRANSLATED_LATIN_RE.search(latin_check):
                errors.append("%s %s contains untranslated Latin text" % (zh_name, path))
            if key == "speech" and LOG_PREFIX_RE.search(text):
                errors.append("%s %s contains a raw log prefix" % (zh_name, path))

    day = payloads.get("day_result.json", {})
    day_zh = payloads.get("day_result_zh.json", {})
    speeches = [x for x in day.get("day_trace", []) if x.get("type") == "speech"]
    zh_speeches = [x for x in day_zh.get("day_trace", []) if x.get("type") == "speech"]
    if len(speeches) != len(zh_speeches):
        errors.append("EN/ZH speech count differs: %d vs %d" % (len(speeches), len(zh_speeches)))

    night = payloads.get("night_result.json", {})
    night_zh = payloads.get("night_result_zh.json", {})
    en_actions = [x.get("action") for x in night.get("night_trace", [])]
    zh_actions = [x.get("action") for x in night_zh.get("night_trace", [])]
    if en_actions != zh_actions:
        errors.append("EN/ZH night trace actions or counts differ")

    en_day_shape = [
        (x.get("type"), x.get("player_name"), x.get("target"))
        for x in day.get("day_trace", [])
    ]
    zh_day_shape = [
        (x.get("type"), x.get("player_name"), x.get("target"))
        for x in day_zh.get("day_trace", [])
    ]
    if en_day_shape != zh_day_shape:
        errors.append("EN/ZH day trace structure differs")

    postgame = payloads.get("postgame_result.json", {}).get("interviews", {})
    postgame_zh = payloads.get("postgame_result_zh.json", {}).get("interviews", {})
    en_interviews = {
        category: [x.get("player_name") for x in items]
        for category, items in postgame.items()
    }
    zh_interviews = {
        category: [x.get("player_name") for x in items]
        for category, items in postgame_zh.items()
    }
    if en_interviews != zh_interviews:
        errors.append("EN/ZH postgame interview structure differs")


def audit_game(game_dir):
    errors = []
    warnings = []
    game_id = game_dir.name
    payloads = {}
    for name in BASE_FILES + ZH_FILES:
        payloads[name] = load_json(game_dir / name, errors)

    manifest = payloads["manifest.json"]
    night = payloads["night_result.json"]
    day = payloads["day_result.json"]
    vote = payloads["vote_result.json"]
    resolve = payloads["resolve_result.json"]
    postgame = payloads["postgame_result.json"]
    day_zh = payloads["day_result_zh.json"]

    for name, data in payloads.items():
        if data and data.get("game_id") not in (None, game_id):
            errors.append("%s game_id=%s" % (name, data.get("game_id")))
    if manifest.get("status") != "completed":
        errors.append("manifest status is %s" % manifest.get("status"))
    if manifest.get("outcome") != resolve.get("outcome"):
        errors.append("manifest outcome does not match resolve")

    players = night.get("players") or {}
    player_rows = list(players.values())
    names = [p.get("name") for p in player_rows]
    if len(players) != 6 or len(set(names)) != 6:
        errors.append("night player roster is not 6 unique players")
    seats = [p.get("seat") for p in player_rows]
    if sorted(seats) != list(range(6)):
        errors.append("invalid or duplicate seating")
    if len(night.get("center_cards") or []) != 3:
        errors.append("center_cards does not contain 3 cards")
    roles = [p.get("initial_role") for p in player_rows] + list(night.get("center_cards") or [])
    unknown_roles = sorted(set(r for r in roles if r not in ALLOWED_ROLES))
    if unknown_roles:
        errors.append("unknown roles: %s" % unknown_roles)

    stats = day.get("player_stats") or {}
    if set(stats) != set(names):
        errors.append("day player_stats roster mismatch")
    speeches = [x for x in day.get("day_trace", []) if x.get("type") == "speech"]
    speech_counts = Counter(x.get("player_name") for x in speeches)
    for name in names:
        recorded = (stats.get(name) or {}).get("speak_count", 0)
        if recorded != speech_counts.get(name, 0):
            errors.append("speech count mismatch for %s: stats=%s trace=%s" % (
                name, recorded, speech_counts.get(name, 0)))
        if recorded == 0:
            warnings.append("%s has zero speeches" % name)
    if not day.get("chat_history"):
        errors.append("day_result chat_history is empty")

    votes = vote.get("votes") or {}
    if set(votes) != set(names):
        errors.append("vote voter roster mismatch")
    for voter, target in votes.items():
        if target not in names:
            errors.append("%s votes for unknown player %s" % (voter, target))
        if voter == target:
            errors.append("%s votes for self" % voter)
    tally = Counter(votes.values())
    if dict(tally) != (vote.get("tally") or {}):
        errors.append("vote tally does not match votes")
    max_votes = max(tally.values()) if tally else 0
    expected_executed = sorted(n for n, count in tally.items() if count == max_votes)
    if sorted(vote.get("executed") or []) != expected_executed:
        errors.append("executed list does not match maximum tally")

    expected_outcome, expected_team, expected_winners = expected_resolution(night, vote)
    if resolve.get("outcome") != expected_outcome:
        errors.append("outcome %s should be %s" % (resolve.get("outcome"), expected_outcome))
    if resolve.get("winner_team") != expected_team:
        errors.append("winner_team %s should be %s" % (resolve.get("winner_team"), expected_team))
    if sorted(resolve.get("winners") or []) != expected_winners:
        errors.append("winner list does not match roles/outcome")
    final_roles = resolve.get("final_roles") or {}
    if set(final_roles) != set(names):
        errors.append("final_roles roster mismatch")
    for player in player_rows:
        row = final_roles.get(player.get("name"), {})
        if row.get("initial_role") != player.get("initial_role"):
            errors.append("initial role mismatch for %s" % player.get("name"))
        if row.get("current_role") != player.get("current_role"):
            errors.append("current role mismatch for %s" % player.get("name"))
        if row.get("team") != team_of(player.get("current_role")):
            errors.append("team mismatch for %s" % player.get("name"))

    interview_names = []
    for items in (postgame.get("interviews") or {}).values():
        interview_names.extend(x.get("player_name") for x in items)
        for item in items:
            if not (item.get("quote") or "").strip():
                errors.append("empty postgame quote for %s" % item.get("player_name"))
    if Counter(interview_names) != Counter(names):
        errors.append("postgame interview coverage/duplicates mismatch")

    audit_language(payloads, errors)
    if not (game_dir / "chat_history_zh.md").exists():
        warnings.append("chat_history_zh.md missing")

    vote_errors = [x for x in vote.get("vote_trace", []) if x.get("error")]
    day_errors = [x for x in day.get("day_trace", []) if x.get("type") == "bridge_error"]
    if vote_errors:
        warnings.append("%d vote fallback/error event(s)" % len(vote_errors))
    if day_errors:
        warnings.append("%d day bridge error event(s)" % len(day_errors))

    return {"game_id": game_id, "errors": errors, "warnings": warnings}


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit_archive_text_files(root):
    errors = []
    files_checked = 0
    strings_checked = 0
    allowed_english_cjk_keys = {"name_zh", "player_name_zh"}

    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        if path.suffix not in {".json", ".md"}:
            continue
        files_checked += 1
        localized = "_zh" in path.stem
        relative = path.relative_to(root)

        if path.suffix == ".md":
            text = path.read_text(encoding="utf-8")
            strings_checked += 1
            if localized:
                if CANTONESE_RE.search(text):
                    errors.append("%s contains Cantonese" % relative)
                if SIMPLIFIED_ONLY_RE.search(text):
                    errors.append("%s contains Simplified Chinese" % relative)
                latin_check = re.sub(r"\bP(?=\s*\()", "", text)
                if UNTRANSLATED_LATIN_RE.search(latin_check):
                    errors.append("%s contains untranslated Latin text" % relative)
                if not CJK_RE.search(text):
                    errors.append("%s does not contain Chinese text" % relative)
            elif CJK_RE.search(text):
                errors.append("%s contains Chinese text" % relative)
            continue

        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append("%s is invalid JSON: %s" % (relative, exc))
            continue

        for field_path, key, text in iter_strings(payload):
            strings_checked += 1
            if localized:
                if key in PROSE_KEYS:
                    if CANTONESE_RE.search(text):
                        errors.append("%s %s contains Cantonese" % (relative, field_path))
                    if SIMPLIFIED_ONLY_RE.search(text):
                        errors.append("%s %s contains Simplified Chinese" % (relative, field_path))
                    latin_check = re.sub(r"\bP(?=\s*\()", "", text)
                    if UNTRANSLATED_LATIN_RE.search(latin_check):
                        errors.append("%s %s contains untranslated Latin text" % (
                            relative, field_path))
            elif CJK_RE.search(text) and key not in allowed_english_cjk_keys:
                errors.append("%s %s contains Chinese text" % (relative, field_path))

    return {
        "root": str(root.relative_to(ROOT)),
        "files_checked": files_checked,
        "strings_checked": strings_checked,
        "errors": errors,
    }


def main():
    public_dirs = sorted(p for p in PUBLIC_ROOT.glob("game_*") if p.is_dir())
    source_dirs = sorted(p for p in SOURCE_ROOT.glob("game_*") if p.is_dir())
    reports = [audit_game(p) for p in public_dirs]
    global_errors = []
    global_warnings = []
    archive_text_audits = [
        audit_archive_text_files(SOURCE_ROOT),
        audit_archive_text_files(PUBLIC_ROOT),
    ]
    for report in archive_text_audits:
        global_errors.extend(
            "%s: %s" % (report["root"], error) for error in report["errors"]
        )

    if [p.name for p in source_dirs] != [p.name for p in public_dirs]:
        global_errors.append("source/public game directory sets differ")
    for public_dir in public_dirs:
        source_dir = SOURCE_ROOT / public_dir.name
        for path in public_dir.iterdir():
            source_path = source_dir / path.name
            if not source_path.exists():
                global_errors.append("%s/%s missing from source archive" % (public_dir.name, path.name))
            elif file_hash(path) != file_hash(source_path):
                global_errors.append("%s/%s differs between source and public" % (public_dir.name, path.name))

    index_errors = []
    index = load_json(INDEX_PATH, index_errors)
    indexed = [x.get("game_id") for x in index.get("games", [])]
    expected_ids = [p.name for p in reversed(public_dirs)]
    if indexed != expected_ids:
        global_errors.append("docs index order/content does not match public game directories")
    for row in index.get("games", []):
        resolve_path = PUBLIC_ROOT / row.get("game_id", "") / "resolve_result.json"
        if resolve_path.exists():
            resolve = json.loads(resolve_path.read_text(encoding="utf-8"))
            if row.get("outcome") != resolve.get("outcome"):
                global_errors.append("%s index outcome mismatch" % row.get("game_id"))
    global_errors.extend(index_errors)

    result = {
        "games": reports,
        "global_errors": global_errors,
        "global_warnings": global_warnings,
        "archive_text_audits": archive_text_audits,
        "summary": {
            "games": len(reports),
            "games_with_errors": sum(bool(r["errors"]) for r in reports),
            "games_with_warnings": sum(bool(r["warnings"]) for r in reports),
            "error_count": len(global_errors) + sum(len(r["errors"]) for r in reports),
            "warning_count": len(global_warnings) + sum(len(r["warnings"]) for r in reports),
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if result["summary"]["error_count"] else 0


if __name__ == "__main__":
    sys.exit(main())
