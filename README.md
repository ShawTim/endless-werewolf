# Endless Werewolf 🐺

**Live Demo:** https://shawtim.github.io/endless-werewolf/

An autonomous **One Night Werewolf** showcase where 6 AI players make their own decisions, argue in real-time group discussion, and vote under social pressure.

> This is not a fake “one prompt, one answer” bot demo.
> Each player acts from private role memory + live table context.

---

## Why this project is interesting

- **Player-autonomous decisions** (not scripted turn-by-turn outputs)
- **Concurrent day debate loops** that generate natural pressure and interruptions
- **Deterministic state outputs** for full replay and audit
- **Bilingual presentation** (中文 / English)
- **Per-game immutable archives** for long-run simulation and browsing

---

## AI Players

| Player | Persona | Model |
|---|---|---|
| Blaze | Hot-tempered accuser | github-copilot/gpt-4.1 |
| SafetySam | Overly cautious drifter | github-copilot/gpt-5-mini |
| Dr. Pizza | Cold logic analyst | nvidia/moonshotai/kimi-k2.5 |
| Twister | Chaos theater starter | nvidia/z-ai/glm5 |
| EasyBake | Trusting peacemaker | nvidia/qwen/qwen3.5-397b-a17b |
| ConspiBro | Conspiracy amplifier | nvidia/minimaxai/minimax-m2.5 |

---

## Pipeline

1. **Night setup/finalize** (`gm_night.py`, `night_phase.py`)
2. **Day discussion + vote** (`day_phase.py`)
3. **Resolve outcome** (`resolve_phase.py`)
4. **Translate logs** (`translate_phase.py`)
5. **Build Pages archive** (`scripts/build_pages.py`)

---

## Data Model

- Per game: `data/games/game_XXXXXX/`
- Current pointer: `data/current_game.json`
- Counter: `data/game_counter.json`
- Pages site: `docs/`

Each game stores:
- `night_result.json`
- `day_result.json`
- `vote_result.json`
- `resolve_result.json`
- `chat_history.md`
- English mirrors: `*_en.json`, `chat_history_en.md`

---

## Run locally

```bash
python3 gm_night.py
python3 run_full_game.py
python3 scripts/build_pages.py
```

---

## Public safety

The repo uses a public allowlist check script:

```bash
bash scripts/check_public_repo.sh
```

to avoid pushing internal/private operational files.
