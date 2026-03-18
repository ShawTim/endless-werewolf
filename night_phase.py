import json
import random
from collections.abc import Mapping
from copy import deepcopy
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent
PLAYERS_PATH = WORKSPACE / "data" / "players.json"
ROLES_PATH = WORKSPACE / "data" / "roles_pool.json"
STATE_DIR = WORKSPACE / "data" / "state"
OUTPUT_PATH = STATE_DIR / "night_result.json"

ROLE_WEREWOLF = "Werewolf (狼人)"
ROLE_SEER = "Seer (預言家)"
ROLE_ROBBER = "Robber (強盜)"
ROLE_TROUBLEMAKER = "Troublemaker (搗蛋鬼)"
ROLE_MINION = "Minion (爪牙)"
ROLE_INSOMNIAC = "Insomniac (失眠者)"


class NightPhaseNeedsAgentDecision(RuntimeError):
    pass


def ensure_dirs():
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def setup_game(players, roles):
    deck = roles[:]
    random.shuffle(deck)
    center_cards = deck[:3]
    player_cards = deck[3:3 + len(players)]

    states = {}
    seating_order = []
    for idx, player in enumerate(players):
        player_state = {
            "id": player["id"],
            "name": player["name"],
            "persona": player["persona"],
            "model": player["model"],
            "seat": idx,
            "initial_role": player_cards[idx],
            "current_role": player_cards[idx],
            "night_memory": [],
            "night_actions": []
        }
        states[player["id"]] = player_state
        seating_order.append(player["id"])

    return {
        "players": states,
        "seating_order": seating_order,
        "center_cards": center_cards,
        "night_trace": []
    }


def role_holders(game, role_name):
    return [pid for pid, state in game["players"].items() if state["initial_role"] == role_name]


def add_memory(state, text):
    state["night_memory"].append(text)


def add_trace(game, item):
    game["night_trace"].append(item)


def build_decision_request(player_state, game, legal_actions):
    other_names = [
        s["name"] for pid, s in game["players"].items()
        if pid != player_state["id"]
    ]
    return {
        "phase": "night",
        "player_name": player_state["name"],
        "persona": player_state["persona"],
        "model": player_state["model"],
        "initial_role": player_state["initial_role"],
        "night_memory": player_state["night_memory"],
        "other_players": other_names,
        "legal_actions": legal_actions,
        "instructions": [
            "You are a player in One Night Werewolf.",
            "Use only your private information.",
            "Return exactly one JSON object.",
            "No markdown, no explanation, no extra text."
        ]
    }


def validate_name(target_name, valid_names):
    return isinstance(target_name, str) and target_name in valid_names


def validate_two_names(targets, valid_names):
    return (
        isinstance(targets, list)
        and len(targets) == 2
        and targets[0] != targets[1]
        and all(validate_name(name, valid_names) for name in targets)
    )


def apply_non_decision_info(game):
    players = game["players"]
    werewolves = role_holders(game, ROLE_WEREWOLF)

    for wid in werewolves:
        wolf_state = players[wid]
        if len(werewolves) >= 2:
            others = [players[x]["name"] for x in werewolves if x != wid]
            add_memory(wolf_state, f"你見到另一隻狼人係：{', '.join(others)}。")
        else:
            add_memory(wolf_state, "你係場上唯一狼人，你可以選擇查看一張中間底牌。")

    minions = role_holders(game, ROLE_MINION)
    for mid in minions:
        minion_state = players[mid]
        if werewolves:
            wolf_names = [players[x]["name"] for x in werewolves]
            add_memory(minion_state, f"你見到狼人係：{', '.join(wolf_names)}。狼人唔知道你係爪牙。")
        else:
            add_memory(minion_state, "你醒來時見唔到任何狼人，代表兩張狼人牌都可能喺中間。")


def request_single_werewolf_peek(game, wid):
    wolf_state = game["players"][wid]
    legal_actions = {
        "action": "inspect_center",
        "target": [0, 1, 2]
    }
    return build_decision_request(wolf_state, game, legal_actions)


def apply_single_werewolf_peek(game, wid, decision, source="agent"):
    wolf_state = game["players"][wid]
    action = decision.get("action")
    target = decision.get("target")
    if action != "inspect_center" or target not in [0, 1, 2]:
        raise ValueError("invalid single werewolf action")

    seen = game["center_cards"][target]
    add_memory(wolf_state, f"你偷看咗中間第 {target} 張底牌，見到佢係：{seen}。")
    wolf_state["night_actions"].append({
        "role": ROLE_WEREWOLF,
        "action": "inspect_center",
        "target": target,
        "seen_role": seen,
        "source": source,
    })
    add_trace(game, {
        "actor": wolf_state["name"],
        "role": ROLE_WEREWOLF,
        "action": "inspect_center",
        "target": target,
        "source": source,
    })


def request_seer_action(game, sid):
    seer_state = game["players"][sid]
    other_names = [s["name"] for pid, s in game["players"].items() if pid != sid]
    legal_actions = {
        "action": "inspect_player | inspect_center",
        "inspect_player": {"target": other_names},
        "inspect_center": {"targets": [[0, 1], [0, 2], [1, 2]]}
    }
    return build_decision_request(seer_state, game, legal_actions)


def apply_seer_action(game, sid, decision, source="agent"):
    seer_state = game["players"][sid]
    other_names = [s["name"] for pid, s in game["players"].items() if pid != sid]
    name_to_id = {s["name"]: pid for pid, s in game["players"].items()}

    action = decision.get("action")
    if action == "inspect_player":
        target_name = decision.get("target")
        if not validate_name(target_name, other_names):
            raise ValueError("invalid seer target")
        target_id = name_to_id[target_name]
        seen = game["players"][target_id]["initial_role"]
        add_memory(seer_state, f"你查驗咗 {target_name}，佢嘅身份係：{seen}。")
        seer_state["night_actions"].append({
            "role": ROLE_SEER,
            "action": action,
            "target": target_name,
            "seen_role": seen,
            "source": source,
        })
        add_trace(game, {
            "actor": seer_state["name"],
            "role": ROLE_SEER,
            "action": action,
            "target": target_name,
            "source": source,
        })
        return

    if action == "inspect_center":
        targets = decision.get("targets")
        valid_pairs = [{0, 1}, {0, 2}, {1, 2}]
        if not isinstance(targets, list) or len(targets) != 2 or set(targets) not in valid_pairs:
            raise ValueError("invalid seer center targets")
        seen = [{"index": i, "role": game["center_cards"][i]} for i in targets]
        add_memory(
            seer_state,
            "你查驗咗中間兩張底牌：" + "，".join([f"第 {x['index']} 張係 {x['role']}" for x in seen]) + "。"
        )
        seer_state["night_actions"].append({
            "role": ROLE_SEER,
            "action": action,
            "targets": targets,
            "seen": seen,
            "source": source,
        })
        add_trace(game, {
            "actor": seer_state["name"],
            "role": ROLE_SEER,
            "action": action,
            "targets": targets,
            "source": source,
        })
        return

    raise ValueError("invalid seer action")


def request_robber_action(game, rid):
    robber_state = game["players"][rid]
    other_names = [s["name"] for pid, s in game["players"].items() if pid != rid]
    legal_actions = {"action": "rob", "target": other_names}
    return build_decision_request(robber_state, game, legal_actions)


def apply_robber_action(game, rid, decision, source="agent"):
    robber_state = game["players"][rid]
    other_names = [s["name"] for pid, s in game["players"].items() if pid != rid]
    name_to_id = {s["name"]: pid for pid, s in game["players"].items()}

    if decision.get("action") != "rob" or not validate_name(decision.get("target"), other_names):
        raise ValueError("invalid robber action")

    target_name = decision["target"]
    target_id = name_to_id[target_name]
    my_old = robber_state["current_role"]
    target_old = game["players"][target_id]["current_role"]
    robber_state["current_role"] = target_old
    game["players"][target_id]["current_role"] = my_old

    add_memory(robber_state, f"你偷咗 {target_name} 張牌，換完之後你而家係：{robber_state['current_role']}。")
    robber_state["night_actions"].append({
        "role": ROLE_ROBBER,
        "action": "rob",
        "target": target_name,
        "new_role": robber_state["current_role"],
        "source": source,
    })
    add_trace(game, {
        "actor": robber_state["name"],
        "role": ROLE_ROBBER,
        "action": "rob",
        "target": target_name,
        "source": source,
    })


def request_troublemaker_action(game, tid):
    trouble_state = game["players"][tid]
    other_names = [s["name"] for pid, s in game["players"].items() if pid != tid]
    legal_actions = {"action": "swap", "targets": other_names}
    return build_decision_request(trouble_state, game, legal_actions)


def apply_troublemaker_action(game, tid, decision, source="agent"):
    trouble_state = game["players"][tid]
    other_names = [s["name"] for pid, s in game["players"].items() if pid != tid]
    name_to_id = {s["name"]: pid for pid, s in game["players"].items()}

    if decision.get("action") != "swap" or not validate_two_names(decision.get("targets"), other_names):
        raise ValueError("invalid troublemaker action")

    name_a, name_b = decision["targets"]
    id_a = name_to_id[name_a]
    id_b = name_to_id[name_b]
    role_a = game["players"][id_a]["current_role"]
    role_b = game["players"][id_b]["current_role"]
    game["players"][id_a]["current_role"] = role_b
    game["players"][id_b]["current_role"] = role_a

    add_memory(trouble_state, f"你交換咗 {name_a} 同 {name_b} 嘅牌，但你唔知道佢哋換完係咩。")
    trouble_state["night_actions"].append({
        "role": ROLE_TROUBLEMAKER,
        "action": "swap",
        "targets": [name_a, name_b],
        "source": source,
    })
    add_trace(game, {
        "actor": trouble_state["name"],
        "role": ROLE_TROUBLEMAKER,
        "action": "swap",
        "targets": [name_a, name_b],
        "source": source,
    })


def resolve_insomniac(game, iid):
    insomniac_state = game["players"][iid]
    add_memory(insomniac_state, f"夜晚最後你睇咗自己張牌，你而家係：{insomniac_state['current_role']}。")
    insomniac_state["night_actions"].append({
        "role": ROLE_INSOMNIAC,
        "action": "inspect_self",
        "seen_role": insomniac_state["current_role"],
        "source": "deterministic",
    })
    add_trace(game, {
        "actor": insomniac_state["name"],
        "role": ROLE_INSOMNIAC,
        "action": "inspect_self",
        "source": "deterministic",
    })


def serialize_for_output(game):
    output = deepcopy(game)
    for state in output["players"].values():
        state["night_memory_text"] = " ".join(state["night_memory"])
    return output


def build_player_private_state(player_state):
    return {
        "id": player_state["id"],
        "name": player_state["name"],
        "model": player_state["model"],
        "persona": player_state["persona"],
        "initial_role": player_state["initial_role"],
        "current_role": player_state["current_role"],
        "night_memory": player_state.get("night_memory_text") or " ".join(player_state["night_memory"]),
        "night_memory_list": list(player_state["night_memory"]),
        "night_actions": deepcopy(player_state.get("night_actions", [])),
    }


def persist_player_private_states(game_or_result):
    result = serialize_for_output(game_or_result) if "night_memory_text" not in next(iter(game_or_result["players"].values())) else deepcopy(game_or_result)
    for player_state in result["players"].values():
        save_json(STATE_DIR / f"player_{player_state['id']}.json", build_player_private_state(player_state))
    return result


def hydrate_game(serialized_game):
    if not isinstance(serialized_game, Mapping):
        raise ValueError("serialized_game must be a mapping")
    return deepcopy(serialized_game)


def prepare_night_phase():
    ensure_dirs()
    players = load_json(PLAYERS_PATH)
    roles = load_json(ROLES_PATH)
    game = setup_game(players, roles)
    apply_non_decision_info(game)
    return game


def resolve_night_phase_with_decisions(game, decisions_by_name):
    players = game["players"]
    werewolves = role_holders(game, ROLE_WEREWOLF)
    if len(werewolves) == 1:
        wid = werewolves[0]
        name = players[wid]["name"]
        apply_single_werewolf_peek(game, wid, decisions_by_name[name])

    for sid in role_holders(game, ROLE_SEER):
        name = players[sid]["name"]
        apply_seer_action(game, sid, decisions_by_name[name])

    for rid in role_holders(game, ROLE_ROBBER):
        name = players[rid]["name"]
        apply_robber_action(game, rid, decisions_by_name[name])

    for tid in role_holders(game, ROLE_TROUBLEMAKER):
        name = players[tid]["name"]
        apply_troublemaker_action(game, tid, decisions_by_name[name])

    for iid in role_holders(game, ROLE_INSOMNIAC):
        resolve_insomniac(game, iid)

    result = serialize_for_output(game)
    save_json(OUTPUT_PATH, result)
    persist_player_private_states(result)
    return result


def build_night_plan(game):
    plan = []
    players = game["players"]
    werewolves = role_holders(game, ROLE_WEREWOLF)
    if len(werewolves) == 1:
        wid = werewolves[0]
        plan.append({
            "player_name": players[wid]["name"],
            "role": ROLE_WEREWOLF,
            "decision_request": request_single_werewolf_peek(game, wid),
        })

    for sid in role_holders(game, ROLE_SEER):
        plan.append({
            "player_name": players[sid]["name"],
            "role": ROLE_SEER,
            "decision_request": request_seer_action(game, sid),
        })

    for rid in role_holders(game, ROLE_ROBBER):
        plan.append({
            "player_name": players[rid]["name"],
            "role": ROLE_ROBBER,
            "decision_request": request_robber_action(game, rid),
        })

    for tid in role_holders(game, ROLE_TROUBLEMAKER):
        plan.append({
            "player_name": players[tid]["name"],
            "role": ROLE_TROUBLEMAKER,
            "decision_request": request_troublemaker_action(game, tid),
        })

    return plan


def run_night_phase():
    game = prepare_night_phase()
    plan = build_night_plan(game)
    raise NightPhaseNeedsAgentDecision({
        "message": "Night phase requires external agent decisions.",
        "plan": plan,
        "partial_state": serialize_for_output(game),
        "output_path": str(OUTPUT_PATH),
    })


if __name__ == "__main__":
    try:
        run_night_phase()
    except NightPhaseNeedsAgentDecision as e:
        payload = e.args[0] if e.args else {"message": str(e)}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
