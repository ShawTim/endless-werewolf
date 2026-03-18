# AI One Night Ultimate Werewolf 🐺

[GitHub Pages Demo / 線上展示](https://shawtim.github.io/endless-werewolf/)

---

## English

An autonomous AI **One Night Ultimate Werewolf** simulation engine.
Six fixed-persona AI players run full rounds (night → day discussion → vote → resolve), and every game is archived for browsing on GitHub Pages.

This is intentionally built as **player-driven decision making**, not a fake "one prompt in, one answer out" demo.
During day phase, players think and react inside a shared live transcript with concurrent speaking windows, so the social battle emerges from in-round pressure rather than prewritten turns.

### Highlights
- **Player-autonomous decisions**: each player decides based on their own role memory + live transcript (not a scripted Q&A bot flow)
- **Live group combat in day phase**: asynchronous multi-player speaking loops create real-time argument pressure, interruptions, and momentum shifts
- **Deterministic game flow** with explicit state transitions
- **Per-game immutable storage** (`data/games/game_XXXXXX/`)
- **Bilingual presentation (中文/English)** on the web UI
- **End-of-flow translation** for logs/results (`*_en.json`, `chat_history_en.md`)
- **Transparent outputs** for demo and audit

### Pipeline
1. **Night** (`gm_night.py` + `night_phase.py`)
2. **Day + Vote** (`day_phase.py`)
3. **Resolve** (`resolve_phase.py`)
4. **Translate to English** (`translate_phase.py`)
5. **Publish archive UI data** (`scripts/build_pages.py`)

### Run
```bash
python3 gm_night.py
python3 run_full_game.py
python3 scripts/build_pages.py
```

---

## 中文（廣東話）

呢個 project 係一個可持續運行嘅 **AI 一夜狼人引擎**。
6 個固定性格 AI 玩家會由夜晚玩到日頭投票再結算，之後每一場都會存檔，俾你喺 GitHub Pages 逐場睇返過程。

重點係：呢個唔係「問一句、答一句」嘅假 demo。
玩家係按自己身份記憶 + 場上最新對話去**自己決策**；
日頭回合係多人並行即場思考同互相施壓，真係群戰，而唔係預寫劇本輪流發言。

### 重點功能
- **玩家自主決策**：每位玩家會根據自己私有資訊同場上紀錄做判斷，唔係單線問答
- **日頭即場群戰**：多人並行發言 loop，會即場拉扯、反擊、帶風向
- **流程 deterministic**：每一步 state 轉換都清晰可追蹤
- **每場獨立存檔**：`data/games/game_XXXXXX/`
- **中英雙語顯示**：Pages 可切換語言
- **流程尾段自動翻英文**：輸出 `*_en.json` 同 `chat_history_en.md`
- **Demo 友好**：可完整回放 night/day/vote/resolve

### 遊戲流程
1. **夜晚**（`gm_night.py` + `night_phase.py`）
2. **日頭辯論 + 投票**（`day_phase.py`）
3. **勝負結算**（`resolve_phase.py`）
4. **英文翻譯輸出**（`translate_phase.py`）
5. **重建頁面資料**（`scripts/build_pages.py`）

### 快速執行
```bash
python3 gm_night.py
python3 run_full_game.py
python3 scripts/build_pages.py
```

---

## Data Layout
- `data/games/game_XXXXXX/` — per-game immutable outputs
- `data/current_game.json` — current game pointer
- `data/game_counter.json` — game id counter
- `docs/` — GitHub Pages site files

## Notes
- Public repo is kept **public-safe** with whitelist checks.
- Internal/private workflow files are excluded from publish scope.
