import asyncio
import json
import random
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import state_manager

WORKSPACE = Path(__file__).resolve().parent
STATE_DIR = WORKSPACE / "data" / "state"
LOGS_DIR = WORKSPACE / "logs"
NIGHT_RESULT_PATH = STATE_DIR / "night_result.json"
CHAT_LOG_PATH = LOGS_DIR / "chat_history.md"
DAY_RESULT_PATH = STATE_DIR / "day_result.json"
VOTE_RESULT_PATH = STATE_DIR / "vote_result.json"
DAY_CONFIG_PATH = STATE_DIR / "day_config.json"

DEFAULT_DAY_DURATION_SECONDS = 90
DEFAULT_MIN_SLEEP_SECONDS = 2.0
DEFAULT_MAX_SLEEP_SECONDS = 7.0
DEFAULT_MAX_SPEAKS_PER_PLAYER = 3


@dataclass
class DayConfig:
    duration_seconds: int = DEFAULT_DAY_DURATION_SECONDS
    min_sleep_seconds: float = DEFAULT_MIN_SLEEP_SECONDS
    max_sleep_seconds: float = DEFAULT_MAX_SLEEP_SECONDS
    max_speaks_per_player: int = DEFAULT_MAX_SPEAKS_PER_PLAYER


class DayPhaseError(RuntimeError):
    pass


class ChatLog:
    def __init__(self, path: Path):
        self.path = path
        self.lock = asyncio.Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("", encoding="utf-8")

    async def read_all(self) -> str:
        async with self.lock:
            return self.path.read_text(encoding="utf-8")

    async def append_speech(self, speaker: str, target: str | None, speech: str) -> str:
        timestamp = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
        target_text = f" @{target}" if target else ""
        line = f"[{timestamp}] {speaker}{target_text}: {speech.strip()}\n"
        async with self.lock:
            with self.path.open("a", encoding="utf-8") as f:
                f.write(line)
        return line


class BridgeAgentClient:
    def __init__(self, bridge_agent_id: str = "ai_werewolf_bridge"):
        self.bridge_agent_id = bridge_agent_id

    async def _call_bridge(self, payload: dict[str, Any]) -> dict[str, Any]:
        cmd = [
            "openclaw", "agent",
            "--agent", self.bridge_agent_id,
            "--message", json.dumps(payload, ensure_ascii=False),
            "--json",
        ]

        proc = await asyncio.to_thread(
            subprocess.run,
            cmd,
            cwd=str(WORKSPACE),
            capture_output=True,
            text=True,
            check=False,
        )

        if proc.returncode != 0:
            raise RuntimeError(f"bridge call failed: {proc.stderr.strip() or proc.stdout.strip()}")

        parsed = json.loads(proc.stdout)
        payloads = (((parsed or {}).get("result") or {}).get("payloads") or [])
        if not payloads:
            return {}

        text = (payloads[0].get("text") or "").strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1 or end <= start:
                return {}
            return json.loads(text[start:end + 1])

    async def request_day_action(self, player_context: dict[str, Any], chat_history: str) -> dict[str, Any]:
        decision = await self._call_bridge({
            "request_type": "day_action",
            "player_context": player_context,
            "model": player_context["model"],
            "chat_history": chat_history,
        })
        return {
            "action": decision.get("action", "pass"),
            "target": decision.get("target"),
            "speech": decision.get("speech", ""),
        }

    async def request_vote(self, player_context: dict[str, Any], chat_history: str, valid_targets: list[str]) -> dict[str, Any]:
        decision = await self._call_bridge({
            "request_type": "vote",
            "player_context": player_context,
            "model": player_context["model"],
            "chat_history": chat_history,
            "valid_targets": valid_targets,
        })
        return {"vote_target": decision.get("vote_target")}


class DayPhaseRuntime:
    def __init__(self, config: DayConfig | None = None):
        self.config = config or DayConfig()
        self.bridge_client = BridgeAgentClient()
        self.chat_log = ChatLog(CHAT_LOG_PATH)
        self.stop_event = asyncio.Event()
        self.day_trace: list[dict[str, Any]] = []
        self.players: list[dict[str, Any]] = []
        self.player_stats: dict[str, dict[str, Any]] = {}
        current = state_manager.ensure_current_game()
        self.game_id = current["game_id"]
        self.game_dir = current["game_dir"]

    def _night_result_path(self) -> Path:
        candidate = self.game_dir / "night_result.json"
        return candidate if candidate.exists() else NIGHT_RESULT_PATH

    def load_players_from_night_result(self) -> list[dict[str, Any]]:
        night_path = self._night_result_path()
        if not night_path.exists():
            raise DayPhaseError(f"night result not found: {night_path}")
        payload = json.loads(night_path.read_text(encoding="utf-8"))
        players = list(payload["players"].values())
        players.sort(key=lambda p: p["seat"])
        return players

    def build_player_context(self, player: dict[str, Any]) -> dict[str, Any]:
        return {
            "player_id": player["id"],
            "player_name": player["name"],
            "persona": player["persona"],
            "model": player["model"],
            "initial_role": player["initial_role"],
            "current_role": player["current_role"],
            "night_memory": player.get("night_memory", []),
            "night_memory_text": player.get("night_memory_text", ""),
        }

    async def player_loop(self, player: dict[str, Any]):
        ctx = self.build_player_context(player)
        player_name = ctx["player_name"]

        while not self.stop_event.is_set() and self.player_stats[player_name]["speak_count"] < self.config.max_speaks_per_player:
            await asyncio.sleep(random.uniform(self.config.min_sleep_seconds, self.config.max_sleep_seconds))
            if self.stop_event.is_set():
                break

            chat_history = await self.chat_log.read_all()
            try:
                decision = await self.bridge_client.request_day_action(ctx, chat_history)
            except Exception as e:
                self.day_trace.append({"type": "bridge_error", "player_name": player_name, "error": str(e)})
                continue

            action = decision.get("action")
            target = decision.get("target")
            speech = (decision.get("speech") or "").strip()

            if action == "pass":
                self.day_trace.append({"type": "pass", "player_name": player_name})
                continue

            if action != "speak" or not speech:
                self.day_trace.append({"type": "invalid_decision", "player_name": player_name, "decision": decision})
                continue

            valid_targets = [p["name"] for p in self.players if p["name"] != player_name]
            if target is not None and target not in valid_targets:
                target = None

            line = await self.chat_log.append_speech(player_name, target, speech)
            self.player_stats[player_name]["speak_count"] += 1
            self.day_trace.append({
                "type": "speech",
                "player_name": player_name,
                "target": target,
                "speech": speech,
                "log_line": line.strip(),
            })

    async def run_discussion(self) -> dict[str, Any]:
        if CHAT_LOG_PATH.exists():
            CHAT_LOG_PATH.write_text("", encoding="utf-8")

        self.players = self.load_players_from_night_result()
        self.player_stats = {p["name"]: {"speak_count": 0} for p in self.players}

        print("\n=== 天亮請睜眼 (Day Phase - 自由辯論) ===")
        print(f"白天階段開始，限時 {self.config.duration_seconds} 秒")
        print(f"玩家：{', '.join(p['name'] for p in self.players)}\n")

        tasks = [asyncio.create_task(self.player_loop(player)) for player in self.players]
        try:
            await asyncio.sleep(self.config.duration_seconds)
        finally:
            self.stop_event.set()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for player, result in zip(self.players, results):
                if isinstance(result, Exception):
                    self.day_trace.append({"type": "task_error", "player_name": player["name"], "error": str(result)})

        chat_history = await self.chat_log.read_all()
        payload = {
            "status": "completed",
            "game_id": self.game_id,
            "config": {
                "duration_seconds": self.config.duration_seconds,
                "min_sleep_seconds": self.config.min_sleep_seconds,
                "max_sleep_seconds": self.config.max_sleep_seconds,
                "max_speaks_per_player": self.config.max_speaks_per_player,
            },
            "player_stats": self.player_stats,
            "day_trace": self.day_trace,
            "chat_history": chat_history,
            "chat_log_path": str(CHAT_LOG_PATH),
        }
        DAY_RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        (self.game_dir / "day_result.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        (self.game_dir / "chat_history.md").write_text(chat_history, encoding="utf-8")
        state_manager.mark_phase(self.game_dir, "day", "day_result.json")
        return payload

    async def run_voting_phase(self) -> dict[str, Any]:
        players = self.load_players_from_night_result()
        chat_history = await self.chat_log.read_all()
        votes: dict[str, str] = {}
        vote_trace: list[dict[str, Any]] = []

        print("\n=== 投票階段 (Voting Phase) ===")
        for player in players:
            ctx = self.build_player_context(player)
            valid_targets = [p["name"] for p in players if p["name"] != player["name"]]
            try:
                decision = await self.bridge_client.request_vote(ctx, chat_history, valid_targets)
                vote_target = decision.get("vote_target")
                if vote_target not in valid_targets:
                    vote_target = random.choice(valid_targets)
            except Exception as e:
                vote_target = random.choice(valid_targets)
                vote_trace.append({"player": player["name"], "error": str(e), "fallback": vote_target})

            votes[player["name"]] = vote_target
            print(f"{player['name']} -> {vote_target}")

        tally: dict[str, int] = {}
        for target in votes.values():
            tally[target] = tally.get(target, 0) + 1
        max_votes = max(tally.values()) if tally else 0
        executed = [name for name, count in tally.items() if count == max_votes]

        payload = {
            "status": "completed",
            "game_id": self.game_id,
            "votes": votes,
            "tally": tally,
            "executed": executed,
            "vote_trace": vote_trace,
        }
        VOTE_RESULT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        (self.game_dir / "vote_result.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        state_manager.mark_phase(self.game_dir, "vote", "vote_result.json")
        return payload


async def run_day_phase_async(config: DayConfig | None = None) -> dict[str, Any]:
    runtime = DayPhaseRuntime(config=config)
    day_result = await runtime.run_discussion()
    vote_result = await runtime.run_voting_phase()
    return {"day": day_result, "vote": vote_result}


def run_day_phase(config: DayConfig | None = None) -> dict[str, Any]:
    return asyncio.run(run_day_phase_async(config=config))


def load_config() -> DayConfig:
    if not DAY_CONFIG_PATH.exists():
        return DayConfig()
    payload = json.loads(DAY_CONFIG_PATH.read_text(encoding="utf-8"))
    return DayConfig(
        duration_seconds=int(payload.get("duration_seconds", DEFAULT_DAY_DURATION_SECONDS)),
        min_sleep_seconds=float(payload.get("min_sleep_seconds", DEFAULT_MIN_SLEEP_SECONDS)),
        max_sleep_seconds=float(payload.get("max_sleep_seconds", DEFAULT_MAX_SLEEP_SECONDS)),
        max_speaks_per_player=int(payload.get("max_speaks_per_player", DEFAULT_MAX_SPEAKS_PER_PLAYER)),
    )


if __name__ == "__main__":
    config = load_config()
    result = run_day_phase(config=config)
    print("\n=== 完成（Day + Vote）===")
    print(json.dumps(result, ensure_ascii=False, indent=2))
