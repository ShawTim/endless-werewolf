import json

import gm_night
import day_phase
import resolve_phase
import postgame_phase
import translate_zh_phase


def main():
    print("=== AI One Night Werewolf Full Run ===")

    # Night prepare/finalize requires decisions; if no decisions supplied,
    # we assume night_result.json already exists from prior GM orchestration.
    print("[1/5] Day + Vote phase...")
    day_result = day_phase.run_day_phase(day_phase.load_config())

    print("[2/5] Resolve phase...")
    resolve_result = resolve_phase.run_resolve_phase()

    print("[3/5] Postgame interviews...")
    postgame_result = postgame_phase.run_postgame_phase()

    # Note: translate_phase (EN) removed — game data is already in English.
    # The old translate_phase.py was zh→en via Google Translate, but it only
    # corrupted name_zh fields (translating Chinese names to bad English).
    # Original English content (persona, speeches) was never touched anyway.

    print("[4/5] Translate logs to Chinese (正體中文書面語)...")
    translate_zh_result = translate_zh_phase.run_translate_zh_phase()

    output = {
        "day_vote": day_result,
        "resolve": resolve_result,
        "postgame": postgame_result,
        "translate_zh": translate_zh_result,
    }

    print("[5/5] Done")
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()