#!/usr/bin/env python3
"""Offline tests for the structured day-debate schema.

Covers the bridge prompt builders, the decision / vote normalisers, the
day-phase bookkeeping that feeds turn_hints and records trace entries, and the
guarantee that structural debate fields are never translated, tagged, or
flagged by the language audits. No network or OpenClaw runtime is needed.
"""

import asyncio
import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import bridge_agent  # noqa: E402
import day_phase  # noqa: E402
import tag_phase  # noqa: E402
import translate_zh_phase  # noqa: E402
from scripts import audit_all_games  # noqa: E402
from scripts import repair_language_data  # noqa: E402

ME = "The Prosecutor"
ROSTER = [
    "The Prosecutor", "The Therapist", "The Chaos Agent",
    "The Gut Player", "The Statistician", "The Underdog",
]
OTHERS = [n for n in ROSTER if n != ME]
CONTEXT = {
    "player_name": ME,
    "persona": "A sharp, formal prosecutor.",
    "initial_role": "Seer",
    "current_role": "Seer",
    "night_memory_text": "I inspected [The Underdog]: <Villager>.",
    "model": "test-model",
}


class PromptBuilderTests(unittest.TestCase):
    def test_thinker_prompt_contains_schema_and_context(self):
        prompt = bridge_agent.build_thinker_prompt(CONTEXT, "", turn_hints={
            "other_players": OTHERS,
            "addressed_by": ["The Chaos Agent"],
            "addressed_stances": {"The Chaos Agent": "accuse"},
            "public_claims": {"The Gut Player": "Troublemaker"},
            "my_last_suspicions": {"The Chaos Agent": 72, "The Underdog": 10},
        })
        for key in ('"reply_to"', '"stance"', '"claimed_role"', '"suspicions"', '"thought"', '"speech"'):
            self.assertIn(key, prompt)
        for stance in bridge_agent.STANCES:
            self.assertIn(stance, prompt)
        for role in bridge_agent.ROLE_WHITELIST:
            self.assertIn(role, prompt)
        for name in OTHERS:
            self.assertIn('"%s": 0-100' % name, prompt)
        self.assertNotIn('"%s": 0-100' % ME, prompt)
        self.assertIn("The Chaos Agent: 72", prompt)
        self.assertIn("The Chaos Agent (accuse)", prompt)
        self.assertIn("The Gut Player: claims to have started as Troublemaker", prompt)
        self.assertIn("reply to or challenge a SPECIFIC player", prompt)
        self.assertIn("do not restart from scratch", prompt)

    def test_thinker_prompt_tolerates_missing_hints(self):
        prompt = bridge_agent.build_thinker_prompt(CONTEXT, "")
        self.assertIn('"suspicions"', prompt)
        self.assertIn("first estimate", prompt)

    def test_vote_prompt_contains_suspicions(self):
        prompt = bridge_agent.build_vote_prompt(
            CONTEXT, "log", OTHERS, my_last_suspicions={"The Therapist": 33},
        )
        self.assertIn('"vote_target"', prompt)
        self.assertIn('"suspicions"', prompt)
        self.assertIn("The Therapist: 33", prompt)
        for name in OTHERS:
            self.assertIn('"%s": 0-100' % name, prompt)
        # Legacy positional call still works.
        self.assertIn('"suspicions"', bridge_agent.build_vote_prompt(CONTEXT, "", OTHERS))


class NormaliserTests(unittest.TestCase):
    def test_match_player(self):
        m = bridge_agent.match_player
        self.assertEqual(m("The Underdog", ROSTER, ME), "The Underdog")
        self.assertEqual(m("  @[the underdog] ", ROSTER, ME), "The Underdog")
        self.assertEqual(m("Underdog", ROSTER, ME), "The Underdog")
        self.assertIsNone(m(ME, ROSTER, ME))
        self.assertIsNone(m("The Ghost", ROSTER, ME))
        self.assertIsNone(m("null", ROSTER, ME))
        self.assertIsNone(m(42, ROSTER, ME))

    def test_stance_whitelist(self):
        n = bridge_agent.normalize_stance
        self.assertEqual(n("Accuse"), "accuse")
        self.assertEqual(n("accusing"), "accuse")
        self.assertEqual(n("defending"), "defend")
        self.assertEqual(n("question"), "question")
        self.assertEqual(n("supportive"), "support")
        self.assertIsNone(n("threaten"))
        self.assertIsNone(n(None))
        self.assertIsNone(n("null"))

    def test_claimed_role_whitelist(self):
        n = bridge_agent.normalize_claimed_role
        self.assertEqual(n("seer"), "Seer")
        self.assertEqual(n("<Robber>"), "Robber")
        self.assertEqual(n("the Troublemaker"), "Troublemaker")
        self.assertIsNone(n("Hunter"))
        self.assertIsNone(n("none"))
        self.assertIsNone(n("Insomniac", roles=["Seer", "Werewolf"]))
        self.assertTrue(set(bridge_agent.ROLE_WHITELIST) <= audit_all_games.ALLOWED_ROLES)

    def test_suspicions_clamp_and_filter(self):
        result = bridge_agent.normalize_suspicions({
            "The Underdog": 140,
            "the chaos agent": -5,
            "The Therapist": "65%",
            "The Gut Player": 49.6,
            "The Statistician": True,
            ME: 50,
            "The Ghost": 90,
            "The Gut Player ": "lots",
        }, ME, ROSTER)
        self.assertEqual(result, {
            "The Therapist": 65,
            "The Chaos Agent": 0,
            "The Gut Player": 50,
            "The Underdog": 100,
        })
        self.assertEqual(list(result), ["The Therapist", "The Chaos Agent", "The Gut Player", "The Underdog"])
        for value in result.values():
            self.assertIsInstance(value, int)

    def test_suspicions_fraction_scaling_and_empty(self):
        n = bridge_agent.normalize_suspicions
        self.assertEqual(n({"The Underdog": 0.25, "The Therapist": 1}, ME, ROSTER),
                         {"The Therapist": 100, "The Underdog": 25})
        self.assertEqual(n({"The Underdog": 1, "The Therapist": 0}, ME, ROSTER),
                         {"The Therapist": 0, "The Underdog": 1})
        self.assertIsNone(n({ME: 50, "Nobody": 3}, ME, ROSTER))
        self.assertIsNone(n(["The Underdog", 50], ME, ROSTER))
        self.assertIsNone(n(None, ME, ROSTER))

    def test_validate_decision_speak(self):
        out = bridge_agent.validate_decision({
            "action": "speak",
            "target": "the chaos agent",
            "reply_to": "[The Chaos Agent]",
            "stance": "ACCUSE",
            "claimed_role": "seer",
            "suspicions": {"The Chaos Agent": 80, ME: 0, "Ghost": 1},
            "speech": "  You are lying.  ",
            "thought": "They contradict the Seer result.",
        }, player_name=ME, player_names=ROSTER, spoken_players=["The Chaos Agent"])
        self.assertEqual(out, {
            "action": "speak",
            "target": "The Chaos Agent",
            "speech": "You are lying.",
            "thought": "They contradict the Seer result.",
            "reply_to": "The Chaos Agent",
            "stance": "accuse",
            "claimed_role": "Seer",
            "suspicions": {"The Chaos Agent": 80},
        })

    def test_validate_decision_drops_invalid_values(self):
        out = bridge_agent.validate_decision({
            "action": "speak",
            "target": ME,
            "reply_to": "The Underdog",
            "stance": "threaten",
            "claimed_role": "Hunter",
            "suspicions": "high",
            "speech": "Hello.",
        }, player_name=ME, player_names=ROSTER, spoken_players=["The Therapist"])
        self.assertIsNone(out["target"])
        self.assertIsNone(out["reply_to"])  # The Underdog has not spoken yet
        self.assertIsNone(out["stance"])
        self.assertIsNone(out["claimed_role"])
        self.assertIsNone(out["suspicions"])
        self.assertEqual(out["thought"], "")

    def test_stance_requires_target(self):
        inherit = bridge_agent.validate_decision({
            "action": "speak", "target": None, "reply_to": "The Therapist",
            "stance": "support", "speech": "Agreed.",
        }, player_name=ME, player_names=ROSTER)
        self.assertEqual(inherit["target"], "The Therapist")
        self.assertEqual(inherit["stance"], "support")
        orphan = bridge_agent.validate_decision({
            "action": "speak", "stance": "question", "speech": "Anyone?",
        }, player_name=ME, player_names=ROSTER)
        self.assertIsNone(orphan["target"])
        self.assertIsNone(orphan["stance"])

    def test_pass_keeps_only_suspicions(self):
        out = bridge_agent.validate_decision({
            "action": "pass", "target": "The Underdog", "reply_to": "The Underdog",
            "stance": "accuse", "claimed_role": "Seer", "speech": "ignored",
            "suspicions": {"The Underdog": 55},
        }, player_name=ME, player_names=ROSTER)
        self.assertEqual(out["action"], "pass")
        self.assertEqual(out["speech"], "")
        for key in ("target", "reply_to", "stance", "claimed_role"):
            self.assertIsNone(out[key])
        self.assertEqual(out["suspicions"], {"The Underdog": 55})

    def test_validate_decision_legacy_call(self):
        out = bridge_agent.validate_decision({"action": "dance", "target": "X"})
        self.assertEqual(out["action"], "pass")
        out = bridge_agent.validate_decision({"action": "speak", "target": "Anyone", "speech": "hi"})
        self.assertEqual(out["target"], "Anyone")
        self.assertIsNone(bridge_agent.validate_decision(None)["suspicions"])

    def test_validate_vote(self):
        out = bridge_agent.validate_vote({
            "vote_target": "the underdog", "thought": "Gut call.",
            "suspicions": {"The Underdog": "90", ME: 10},
        }, player_name=ME, valid_targets=OTHERS, player_names=ROSTER)
        self.assertEqual(out, {
            "vote_target": "The Underdog", "thought": "Gut call.",
            "suspicions": {"The Underdog": 90},
        })
        self.assertIsNone(bridge_agent.validate_vote(
            {"vote_target": ME}, player_name=ME, valid_targets=OTHERS)["vote_target"])
        self.assertIsNone(bridge_agent.validate_vote(
            {"vote_target": "Ghost"}, player_name=ME, valid_targets=OTHERS)["vote_target"])


def bare_runtime():
    runtime = day_phase.DayPhaseRuntime.__new__(day_phase.DayPhaseRuntime)
    runtime.day_trace = []
    runtime.last_suspicions = {}
    runtime.players = [{"name": n} for n in ROSTER]
    return runtime


class FakeBridge(day_phase.BridgeAgentClient):
    def __init__(self, response):
        super().__init__()
        self.response = response
        self.prompts = []

    async def _call_bridge(self, prompt, model=None, thinking=None):
        self.prompts.append(prompt)
        result = copy.deepcopy(self.response)
        result["_meta"] = {"model": model or "", "thinking": thinking or "off", "latency_ms": 1}
        return result


class DayPhaseTests(unittest.TestCase):
    def test_turn_hint_helpers(self):
        rt = bare_runtime()
        rt.day_trace = [
            {"type": "speech", "player_name": ME, "target": None, "claimed_role": "Seer"},
            {"type": "speech", "player_name": "The Chaos Agent", "target": ME, "stance": "accuse"},
            {"type": "pass", "player_name": "The Underdog"},
            {"type": "speech", "player_name": "The Therapist", "target": "The Chaos Agent",
             "reply_to": ME, "stance": "question", "claimed_role": "Villager"},
            {"type": "speech", "player_name": "The Gut Player", "target": "The Underdog"},
        ]
        names, stances = rt._addressed_by(ME)
        self.assertEqual(names, ["The Chaos Agent", "The Therapist"])
        self.assertEqual(stances, {"The Chaos Agent": "accuse"})
        self.assertEqual(rt._public_claims(), {ME: "Seer", "The Therapist": "Villager"})
        self.assertEqual(rt._spoken_players(), [ME, "The Chaos Agent", "The Therapist", "The Gut Player"])
        # Speeches before my latest speech no longer count as unanswered.
        rt.day_trace.append({"type": "speech", "player_name": ME, "target": "The Chaos Agent"})
        self.assertEqual(rt._addressed_by(ME), ([], {}))

    def test_remember_suspicions_merges(self):
        rt = bare_runtime()
        rt._remember_suspicions(ME, {"The Underdog": 40, "The Therapist": 20})
        rt._remember_suspicions(ME, {"The Underdog": 70})
        rt._remember_suspicions(ME, None)
        self.assertEqual(rt.last_suspicions[ME], {"The Underdog": 70, "The Therapist": 20})

    def test_request_day_action_normalises(self):
        bridge = FakeBridge({
            "action": "speak", "target": "chaos agent", "reply_to": "The Chaos Agent",
            "stance": "defend", "claimed_role": "SEER", "speech": "I trust them.",
            "thought": "Hmm.", "suspicions": {"The Chaos Agent": 12.4, ME: 99, "Ghost": 3},
        })
        hints = {"all_players": ROSTER, "spoken_players": ["The Chaos Agent"],
                 "other_players": OTHERS, "my_last_suspicions": {"The Chaos Agent": 30}}
        out = asyncio.run(bridge.request_day_action(CONTEXT, "", turn_hints=hints))
        self.assertEqual(out["target"], "The Chaos Agent")
        self.assertEqual(out["reply_to"], "The Chaos Agent")
        self.assertEqual(out["stance"], "defend")
        self.assertEqual(out["claimed_role"], "Seer")
        self.assertEqual(out["suspicions"], {"The Chaos Agent": 12})
        self.assertIn("The Chaos Agent: 30", bridge.prompts[0])

    def test_request_vote_normalises(self):
        bridge = FakeBridge({"vote_target": "The Underdog", "thought": "x",
                             "suspicions": {"The Underdog": 101}})
        out = asyncio.run(bridge.request_vote(
            CONTEXT, "", OTHERS, my_last_suspicions={"The Underdog": 64}, player_names=ROSTER))
        self.assertEqual(out["vote_target"], "The Underdog")
        self.assertEqual(out["suspicions"], {"The Underdog": 100})
        self.assertIn("The Underdog: 64", bridge.prompts[0])

    def test_vote_trace_records_suspicions(self):
        rt = bare_runtime()
        rt.game_id = "game_test"
        rt.bridge_client = FakeBridge({"vote_target": "The Underdog", "thought": "x",
                                       "suspicions": {"The Underdog": 77}})
        rt.last_suspicions = {ME: {"The Underdog": 60}}
        player = dict(CONTEXT, id="p1", name=ME, seat=0)
        name, target, trace = asyncio.run(rt._vote_one(player, [{"name": n} for n in ROSTER], ""))
        self.assertEqual((name, target), (ME, "The Underdog"))
        self.assertEqual(trace["suspicions"], {"The Underdog": 77})
        self.assertEqual(trace["thought"], "x")


SPEECH_EVENT = {
    "type": "speech",
    "player_name": "The Prosecutor",
    "target": "The Chaos Agent",
    "reply_to": "The Chaos Agent",
    "stance": "accuse",
    "claimed_role": "Seer",
    "suspicions": {"The Chaos Agent": 80, "The Underdog": 15},
    "speech": "The Chaos Agent is lying about the Seer.",
    "thought": "The Underdog is a Villager.",
}


class PipelineTests(unittest.TestCase):
    def test_translation_only_touches_prose(self):
        payload = {"day_trace": [copy.deepcopy(SPEECH_EVENT)],
                   "vote_trace": [{"player": "The Underdog", "target": "The Chaos Agent",
                                   "suspicions": {"The Chaos Agent": 66}, "thought": "Gut."}]}
        collected = sorted(item[0] for item in translate_zh_phase._collect_translatable(payload))
        self.assertEqual(collected, ["speech", "thought", "thought"])
        texts = {item[1]: "譯文" for item in translate_zh_phase._collect_translatable(payload)}
        translated = translate_zh_phase._apply_translations(payload, texts)
        event = translated["day_trace"][0]
        for key in ("target", "reply_to", "stance", "claimed_role", "suspicions"):
            self.assertEqual(event[key], SPEECH_EVENT[key])
        self.assertEqual(event["speech"], "譯文")
        self.assertEqual(event["thought"], "譯文")
        self.assertEqual(translated["vote_trace"][0]["suspicions"], {"The Chaos Agent": 66})

    def test_tagging_never_touches_structural_fields(self):
        tagged = tag_phase._tag_object(copy.deepcopy(SPEECH_EVENT), ROSTER)
        for key in ("target", "reply_to", "stance", "claimed_role", "suspicions"):
            self.assertEqual(tagged[key], SPEECH_EVENT[key])
        self.assertIn("[The Chaos Agent]", tagged["speech"])
        self.assertIn("<Seer>", tagged["speech"])
        self.assertIn("<Villager>", tagged["thought"])
        zh = tag_phase._tag_zh_players(copy.deepcopy(SPEECH_EVENT), ["The Underdog"])
        self.assertEqual(zh["suspicions"], SPEECH_EVENT["suspicions"])

    def test_repair_iter_prose_skips_structural_fields(self):
        keys = sorted(key for _, key, _ in repair_language_data.iter_prose(
            {"day_trace": [copy.deepcopy(SPEECH_EVENT)]}))
        self.assertEqual(keys, ["speech", "thought"])

    def test_audit_accepts_valid_and_rejects_bad_debate_fields(self):
        names = set(ROSTER)
        errors = []
        audit_all_games.audit_debate_fields(
            {"day_trace": [SPEECH_EVENT, {"type": "pass", "player_name": "The Underdog",
                                          "suspicions": {"The Chaos Agent": 50}}]},
            {"vote_trace": [{"player": "The Underdog", "suspicions": {"The Chaos Agent": 66}}]},
            names, errors)
        self.assertEqual(errors, [])
        # Old games without any of the fields are valid.
        audit_all_games.audit_debate_fields(
            {"day_trace": [{"type": "speech", "player_name": ME, "target": None}]},
            {"vote_trace": [{"player": ME, "target": "The Underdog"}]}, names, errors)
        self.assertEqual(errors, [])
        bad = dict(SPEECH_EVENT, reply_to=ME, stance="threaten", claimed_role="Hunter",
                   suspicions={ME: 10, "Ghost": 5, "The Underdog": 150})
        audit_all_games.audit_debate_fields({"day_trace": [bad]}, {}, names, errors)
        joined = "\n".join(errors)
        for fragment in ("reply_to", "stance", "claimed_role", "includes the speaker",
                         "unknown player Ghost", "int 0-100"):
            self.assertIn(fragment, joined)

    def test_language_audit_ignores_structural_fields_and_checks_parity(self):
        zh_event = dict(SPEECH_EVENT, speech="[攪局者]在說謊。", thought="[小人物]是村民。")
        payloads = {name: {} for name in audit_all_games.BASE_FILES[1:] + audit_all_games.ZH_FILES}
        payloads["day_result.json"] = {"day_trace": [SPEECH_EVENT]}
        payloads["day_result_zh.json"] = {"day_trace": [zh_event]}
        errors = []
        audit_all_games.audit_language(payloads, errors)
        self.assertEqual(errors, [])
        payloads["day_result_zh.json"] = {"day_trace": [dict(zh_event, claimed_role="預言家")]}
        errors = []
        audit_all_games.audit_language(payloads, errors)
        self.assertIn("EN/ZH day trace debate fields differ", errors)


if __name__ == "__main__":
    unittest.main()
