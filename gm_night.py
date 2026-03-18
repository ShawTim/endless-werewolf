import json
from pathlib import Path

import night_phase
import state_manager

WORKSPACE = Path(__file__).resolve().parent
RUN_DIR = WORKSPACE / "data" / "state"


class NightDecisionValidationError(ValueError):
    pass


def _save(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _game_paths(game_dir: Path) -> dict[str, Path]:
    return {
        "plan": game_dir / "night_plan.json",
        "partial": game_dir / "night_partial_state.json",
        "result": game_dir / "night_result.json",
    }


def prepare_run(start_new_game: bool = True):
    if start_new_game:
        started = state_manager.start_new_game()
        game_id = started["game_id"]
        game_dir = started["game_dir"]
    else:
        current = state_manager.ensure_current_game()
        game_id = current["game_id"]
        game_dir = current["game_dir"]

    paths = _game_paths(game_dir)

    game = night_phase.prepare_night_phase()
    plan = night_phase.build_night_plan(game)
    partial_state = night_phase.serialize_for_output(game)

    _save(paths["plan"], plan)
    _save(paths["partial"], partial_state)

    # keep legacy single-slot files for compatibility
    _save(RUN_DIR / "night_plan.json", plan)
    _save(RUN_DIR / "night_partial_state.json", partial_state)

    state_manager.mark_phase(game_dir, "night_prepare", "night_partial_state.json")

    return {
        "game_id": game_id,
        "game_dir": str(game_dir),
        "plan": plan,
        "partial_state": partial_state,
        "plan_path": str(paths["plan"]),
        "partial_state_path": str(paths["partial"]),
        "result_path": str(paths["result"]),
    }


def _validate_decision_map(plan, decisions_by_name):
    if not isinstance(decisions_by_name, dict):
        raise NightDecisionValidationError("decisions_by_name must be a dict keyed by player_name")

    required = [step["player_name"] for step in plan]
    missing = [name for name in required if name not in decisions_by_name]
    if missing:
        raise NightDecisionValidationError(f"missing decisions for: {', '.join(missing)}")

    for name in required:
        if not isinstance(decisions_by_name[name], dict):
            raise NightDecisionValidationError(f"decision for {name} must be a JSON object")


def finalize_run(decisions_by_name, prepared_state=None, game_dir: str | None = None):
    if game_dir:
        gdir = Path(game_dir)
    else:
        current = state_manager.ensure_current_game()
        gdir = current["game_dir"]

    paths = _game_paths(gdir)

    if prepared_state is None:
        if not paths["partial"].exists():
            raise NightDecisionValidationError("no prepared night state found; run prepare_run() first")
        prepared_state = json.loads(paths["partial"].read_text(encoding="utf-8"))

    game = night_phase.hydrate_game(prepared_state)
    plan = night_phase.build_night_plan(game)
    _validate_decision_map(plan, decisions_by_name)

    result = night_phase.resolve_night_phase_with_decisions(game, decisions_by_name)

    # copy result to game dir + legacy slot
    _save(paths["result"], result)
    _save(RUN_DIR / "night_result.json", result)

    # player files are written to legacy by night_phase; snapshot into game dir
    for i in range(1, 7):
        src = RUN_DIR / f"player_{i}.json"
        if src.exists():
            (gdir / f"player_{i}.json").write_text(src.read_text(encoding="utf-8"), encoding="utf-8")

    state_manager.mark_phase(gdir, "night_finalize", "night_result.json")

    return {
        "result": result,
        "result_path": str(paths["result"]),
        "game_dir": str(gdir),
    }


def finalize_from_bundle(bundle):
    if not isinstance(bundle, dict):
        raise NightDecisionValidationError("bundle must be a JSON object")

    decisions = bundle.get("decisions_by_name")
    prepared_state = bundle.get("prepared_state")
    game_dir = bundle.get("game_dir")
    return finalize_run(decisions, prepared_state=prepared_state, game_dir=game_dir)


if __name__ == "__main__":
    prepared = prepare_run(start_new_game=True)
    print(json.dumps(prepared, ensure_ascii=False, indent=2))
