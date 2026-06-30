# Endless Werewolf

**Live Demo:** https://shawtim.github.io/endless-werewolf/

An autonomous **One Night Ultimate Werewolf** simulation where 6 AI players — each running a different LLM — make their own decisions across every phase: night actions, daytime debate, voting, and postgame interviews.

> Not a scripted demo. Every decision is made by the AI player's own model at runtime.

---

## What this is

A simulation engine that runs a full game of One Night Ultimate Werewolf and publishes the results to an interactive 3D showcase on GitHub Pages.

Each of the 6 players has:
- A **distinct persona** (e.g. relentless prosecutor, nervous newcomer)
- A **specific LLM** assigned to them
- **Private role knowledge** from the night phase
- Access to the **live chat log** as context
- **Cross-game memory** — each player recalls the previous game's events

---

## What is and isn't AI-driven

| Phase | Decision maker |
|---|---|
| Card dealing & role assignment | Rule-based (random shuffle) |
| Night actions (who to inspect, rob, swap) | **AI** — each player decides based on their role and persona |
| Daytime debate (what to say, who to target) | **AI** — 6 concurrent thinker subagents |
| Voting (who to execute) | **AI** |
| Outcome resolution | Rule-based (One Night Werewolf rules) |
| Postgame interviews | **AI** — each player reflects in character |
| Chinese translation | **Gemini 3.1 Pro** (正體中文書面語) |

---

## Architecture

```
gm_night.py              — deal cards, build night plan
bridge_agent.py          — LLM bridge: receives decision request → spawns subagent → returns JSON
night_phase.py           — night actions: seer, robber, troublemaker, etc.
day_phase.py             — concurrent AI debate loop
resolve_phase.py         — rule-based outcome resolution
postgame_phase.py        — AI postgame interviews
tag_phase.py             — post-process: add <Role> [Player] markup
translate_zh_phase.py    — Gemini translation (EN → 正體中文書面語)
cross_game_memory.py     — inject previous game data into player prompts
state_manager.py         — game dirs, manifests, counters
run_full_game.py         — orchestrates the full pipeline
```

The **bridge agent** is an [OpenClaw](https://openclaw.ai) agent that receives a player decision request, then spawns a short-lived **thinker subagent** using that player's assigned model. The subagent thinks, responds in JSON, and is deleted.

This project runs on the **OpenClaw platform**. It cannot be run standalone without that infrastructure.

---

## Text Markup

Game data uses a lightweight tagging system for roles and players:

- `<Werewolf>` `<Seer>` — game roles (highlighted purple in UI)
- `[The Prosecutor]` — player names (highlighted gold in UI)

Tags are added by `tag_phase.py` (post-processing, not by AI agents) and used for:
1. Consistent visual highlighting in the frontend
2. Deterministic translation (`<Seer>` always becomes `<預言家>`, never `<先知>`)

---

## Data Layout

```
data/
  players.json               ← player roster (personas, models)
  roles_pool.json            ← role definitions
  games/game_XXXXXX/         ← per-game data
    night_result.json          ← original (English)
    day_result.json
    vote_result.json
    resolve_result.json
    postgame_result.json
    chat_history.md
    *_zh.json                  ← Chinese translations
docs/                         ← GitHub Pages site
  app.js, styles.css, index.html
  data/games/                 ← published game archive
```

---

## 中文說明

**一夜狼人 AI 自主模擬**，6 個 AI 玩家各自用不同的 LLM，根據自己的角色記憶和場上即時對話做決策。不是腳本演示——每個決策都是 AI 玩家在執行時自主做出的。

### 特色

- **全自主決策**：夜晚行動、白天辯論、投票、賽後訪問全部由 AI 自主完成
- **跨局記憶**：每個玩家記得上一局的完整過程，會影響判斷
- **多模型協作**：6 個玩家用不同的 LLM，各有獨特的性格和決策風格
- **雙語支援**：英文和正體中文書面語，角色名和玩家名翻譯一致
- **3D 互動界面**：Three.js 場景，AI 生成貼圖，可旋轉查看每個角色

### 技術架構

整個遊戲由 cron script 定時觸發。每個玩家的決策透過 **bridge agent**（[OpenClaw](https://openclaw.ai) agent）呼叫對應 LLM 的 thinker subagent 完成。

翻譯由 **Gemini 3.1 Pro** 負責，使用正體中文書面語（非粵語口語）。

此項目依賴 OpenClaw 平台基建，不能在沒有該平台的環境下直接運行。

---

## License

[MIT](LICENSE)
