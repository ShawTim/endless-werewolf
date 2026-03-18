import json

import gm_night
import day_phase
import resolve_phase


def main():
    print("=== AI One Night Werewolf Full Run ===")

    # Night prepare/finalize requires decisions; if no decisions supplied,
    # we assume night_result.json already exists from prior GM orchestration.
    print("[1/3] Day + Vote phase...")
    day_result = day_phase.run_day_phase(day_phase.load_config())

    print("[2/3] Resolve phase...")
    resolve_result = resolve_phase.run_resolve_phase()

    output = {
        "day_vote": day_result,
        "resolve": resolve_result,
    }

    print("[3/3] Done")
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
