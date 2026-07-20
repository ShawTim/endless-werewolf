#!/usr/bin/env python3
"""Regression tests for bilingual archive generation and validation."""

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import translate_zh_phase
from scripts.audit_all_games import audit_language
from scripts.repair_language_data import clean_existing_zh, normalize_chinese_markup


def bilingual_payloads(english: str, chinese: str) -> dict:
    payloads = {
        "night_result.json": {},
        "night_result_zh.json": {},
        "day_result.json": {
            "day_trace": [{
                "type": "speech",
                "player_name": "The Gut Player",
                "target": None,
                "speech": english,
            }],
        },
        "day_result_zh.json": {
            "day_trace": [{
                "type": "speech",
                "player_name": "The Gut Player",
                "target": None,
                "speech": chinese,
            }],
        },
        "vote_result.json": {},
        "vote_result_zh.json": {},
        "resolve_result.json": {},
        "resolve_result_zh.json": {},
        "postgame_result.json": {},
        "postgame_result_zh.json": {},
    }
    return payloads


class LanguageAuditTests(unittest.TestCase):
    def audit_errors(self, english: str, chinese: str) -> list[str]:
        errors = []
        audit_language(bilingual_payloads(english, chinese), errors)
        return errors

    def test_clean_english_and_traditional_chinese_pass(self):
        errors = self.audit_errors(
            "Good morning. Last night I was the Robber.",
            "大家早安。昨晚我是強盜。",
        )
        self.assertEqual(errors, [])

    def test_chinese_in_english_is_rejected(self):
        errors = self.audit_errors(
            "Good morning. 昨晚 I was the Robber.",
            "大家早安。昨晚我是強盜。",
        )
        self.assertTrue(any("contains Chinese text" in error for error in errors))

    def test_cantonese_in_chinese_is_rejected(self):
        errors = self.audit_errors(
            "Good morning. Last night I was the Robber.",
            "我哋而家應該先討論昨晚發生的事情。",
        )
        self.assertTrue(any("contains Cantonese" in error for error in errors))

    def test_simplified_character_in_chinese_is_rejected(self):
        errors = self.audit_errors(
            "I am holding the Robber card.",
            "我現在拿着強盜牌。",
        )
        self.assertTrue(any("contains Simplified Chinese" in error for error in errors))

    def test_latin_alias_attached_to_chinese_is_rejected(self):
        errors = self.audit_errors(
            "The Gut Player claimed Troublemaker.",
            "Gut Player聲稱自己是搗蛋鬼。",
        )
        self.assertTrue(any("contains untranslated Latin text" in error for error in errors))

    def test_repair_handles_aliases_without_unicode_word_boundaries(self):
        repaired = normalize_chinese_markup(
            "Gut Player聲稱ME作為Werewolf拿着Underdog和Chaos Agent的牌。"
        )
        self.assertEqual(
            repaired,
            "直覺俠聲稱我作為狼人拿著小人物和攪局者的牌。",
        )
        self.assertTrue(clean_existing_zh(repaired, "speech"))


class ChineseGenerationTests(unittest.TestCase):
    def test_mixed_prose_is_never_skipped(self):
        self.assertTrue(
            translate_zh_phase._needs_translation(
                "speech",
                "這段內容 mostly translated but still contains English.",
            )
        )

    def test_translation_response_count_must_match(self):
        self.assertEqual(
            translate_zh_phase._parse_llm_response('["只有一項"]', 2),
            [],
        )

    def test_translation_prompt_does_not_truncate_long_prose(self):
        source = "Long source sentence. " * 300
        prompt = translate_zh_phase._build_translation_prompt([("speech", source)])
        self.assertIn(source, prompt)

    def test_translation_validator_rejects_all_known_failure_modes(self):
        bad_values = [
            "我哋而家開始。",
            "我現在拿着強盜牌。",
            "Gut Player聲稱自己是搗蛋鬼。",
        ]
        for value in bad_values:
            with self.subTest(value=value):
                with self.assertRaises(RuntimeError):
                    translate_zh_phase._validate_chinese_translation(value, "source")

    def test_reasoning_and_night_memory_lists_are_translated(self):
        payload = {
            "reasoning": "I should inspect the center cards.",
            "night_memory": [
                "I inspected the first center card.",
                "It was the Robber.",
            ],
        }
        collected = translate_zh_phase._collect_translatable(payload)
        self.assertEqual(
            [item[1] for item in collected],
            [
                "I should inspect the center cards.",
                "I inspected the first center card.",
                "It was the Robber.",
            ],
        )
        translated = translate_zh_phase._apply_translations(
            payload,
            {
                "I should inspect the center cards.": "我應該查看中央牌。",
                "I inspected the first center card.": "我查看了第一張中央牌。",
                "It was the Robber.": "那張牌是強盜。",
            },
        )
        self.assertEqual(translated["reasoning"], "我應該查看中央牌。")
        self.assertEqual(
            translated["night_memory"],
            ["我查看了第一張中央牌。", "那張牌是強盜。"],
        )

    def test_day_chat_is_rebuilt_from_translated_speeches(self):
        day = {
            "day_trace": [
                {
                    "type": "speech",
                    "player_name": "The Gut Player",
                    "target": "The Underdog",
                    "speech": "我認為你值得信任。",
                    "log_line": "stale English log line",
                },
                {
                    "type": "pass",
                    "player_name": "The Underdog",
                    "log_line": "stale pass log",
                },
            ],
            "chat_history": "stale English chat",
        }
        translate_zh_phase._rebuild_chinese_day_log(
            day,
            {
                "The Gut Player": "直覺俠",
                "The Underdog": "小人物",
            },
        )
        self.assertEqual(
            day["chat_history"],
            "直覺俠 @小人物: 我認為你值得信任。\n",
        )
        self.assertEqual(
            day["day_trace"][0]["log_line"],
            "直覺俠 @小人物: 我認為你值得信任。",
        )
        self.assertNotIn("log_line", day["day_trace"][1])


if __name__ == "__main__":
    unittest.main()
