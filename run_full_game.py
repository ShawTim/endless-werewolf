import json

import gm_night
import day_phase
import resolve_phase
import postgame_phase
import translate_phase


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

    print("[4/5] Translate logs to English...")
    translate_result = translate_phase.run_translate_phase()

    output = {
        "day_vote": day_result,
        "resolve": resolve_result,
        "postgame": postgame_result,
        "translate": translate_result,
    }

    print("[5/5] Done")
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
