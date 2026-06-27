import json

import gm_night
import day_phase
import resolve_phase
import postgame_phase
import translate_phase
import translate_zh_phase


def main():
    print("=== AI One Night Werewolf Full Run ===")

    # Night prepare/finalize requires decisions; if no decisions supplied,
    # we assume night_result.json already exists from prior GM orchestration.
    print("[1/6] Day + Vote phase...")
    day_result = day_phase.run_day_phase(day_phase.load_config())

    print("[2/6] Resolve phase...")
    resolve_result = resolve_phase.run_resolve_phase()

    print("[3/6] Postgame interviews...")
    postgame_result = postgame_phase.run_postgame_phase()

    print("[4/6] Translate logs to English...")
    translate_result = translate_phase.run_translate_phase()

    print("[5/6] Translate logs to Chinese (正體中文書面語)...")
    translate_zh_result = translate_zh_phase.run_translate_zh_phase()

    output = {
        "day_vote": day_result,
        "resolve": resolve_result,
        "postgame": postgame_result,
        "translate_en": translate_result,
        "translate_zh": translate_zh_result,
    }

    print("[6/6] Done")
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
