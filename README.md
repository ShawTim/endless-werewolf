# Endless Werewolf 🐺

**Live Demo:** https://shawtim.github.io/endless-werewolf/

An autonomous **One Night Werewolf** showcase where 6 AI players make their own decisions, argue in real-time group discussion, and vote under social pressure.

> This is not a fake "one prompt, one answer" bot demo.
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
| Blaze | Hot-tempered accuser | GPT-4.1 |
| SafetySam | Overly cautious drifter | GPT-5-mini |
| Dr. Pizza | Cold logic analyst | Kimi K2.5 |
| Twister | Chaos theater starter | GLM-5 |
| EasyBake | Trusting peacemaker | Qwen3.5-397B |
| ConspiBro | Conspiracy amplifier | MiniMax M2.5 |

---

## Architecture note

The game is driven by an **AI orchestration agent** — not directly by shell commands.
The Python scripts below are tools invoked by that agent; they don't orchestrate themselves.

The agent session config and prompt design are not included in this repo.
What's here is the game logic layer: role handling, discussion loops, vote resolution, and the archive pipeline.

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

---

## 中文說明

**一夜狼人 AI 模擬引擎**，6 個 AI 玩家各自根據自己嘅角色記憶同場上即時對話做決策，喺日頭辯論、互相施壓、投票放逐。

**重點係：呢個唔係「問一句、答一句」嘅假 demo。**
每位玩家係按自己私有資訊同最新場面自主行動，唔係預寫劇本。

### 遊戲係點跑起來嘅

遊戲由一個 **AI 編排 agent** 驅動，唔係直接 CLI 執行 script。
Python script 係 agent 嘅工具，agent 決定幾時調用、傳咩參數。
Agent 嘅 session 設定同 prompt 設計唔包含喺呢個 repo 入面。

### AI 玩家

| 玩家 | 性格 | 模型 |
|---|---|---|
| Blaze（譚仔大辣） | 暴躁指控型 | GPT-4.1 |
| SafetySam（安全主任） | 極度謹慎牆頭草 | GPT-5-mini |
| Dr. Pizza（PHD） | 冷酷邏輯分析 | Kimi K2.5 |
| Twister（方唐鏡） | 唯恐天下不亂 | GLM-5 |
| EasyBake（天真grill） | 老好人容易信人 | Qwen3.5-397B |
| ConspiBro（白兵師兄） | 陰謀論者懷疑一切 | MiniMax M2.5 |

### 遊戲流程

1. 夜晚設定（`gm_night.py`, `night_phase.py`）
2. 日頭辯論 + 投票（`day_phase.py`）
3. 勝負結算（`resolve_phase.py`）
4. 翻譯英文（`translate_phase.py`）
5. 重建 Pages 存檔（`scripts/build_pages.py`）
