# Endless Werewolf 🐺

**Live Demo:** https://shawtim.github.io/endless-werewolf/

An autonomous **One Night Ultimate Werewolf** simulation where 6 AI players — each running a different LLM — make their own decisions across every phase: night actions, daytime debate, voting, and postgame interviews.

> Not a scripted demo. Every decision is made by the AI player's own model at runtime.

---

## What this is

A cron-driven simulation loop that runs a full game every few hours and publishes the results to GitHub Pages.

Each of the 6 players has:
- A **distinct persona** (e.g. hot-tempered accuser, conspiracy theorist)
- A **specific LLM** assigned to them
- **Private role knowledge** from the night phase
- Access to the **live chat log** as context

Every game is fully logged and archived for replay.

---

## AI Players

| Player | Persona | Model |
|---|---|---|
| Blaze（譚仔大辣） | Hot-tempered accuser | GPT-4.1 |
| SafetySam（安全主任） | Overly cautious drifter | GPT-5-mini |
| Dr. Pizza（PHD） | Cold logic analyst | Kimi K2.5 |
| Twister（方唐鏡） | Chaos agent, lies for fun | GLM-5 |
| EasyBake（天真grill） | Naïve peacemaker | Qwen3.5-397B |
| ConspiBro（白兵師兄） | Conspiracy theorist | MiniMax M2.5 |

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
| English translation | Google Translate API |

---

## Architecture

```
cron_run_game_publish.sh (scheduled)
  │
  ├─ gm_night.py          — deal cards, build night plan
  ├─ [bridge agent × N]   — AI night action per player
  │
  └─ run_full_game.py
       ├─ day_phase.py     — concurrent AI debate loop
       │    └─ [bridge agent × 6 per turn]
       ├─ resolve_phase.py — rule-based outcome
       ├─ postgame_phase.py — AI postgame interviews
       └─ translate_phase.py — English translation
```

The **bridge agent** is an [OpenClaw](https://openclaw.ai) agent that receives a player decision request, then spawns a short-lived **thinker subagent** using that player's assigned model. The subagent thinks, responds in JSON, and is deleted.

This project runs on the **OpenClaw platform**, which provides the `openclaw agent` CLI and `sessions_spawn` API used internally. It cannot be run standalone without that infrastructure.

---

## Pipeline

1. **Night setup** — roles assigned, night plan built (`gm_night.py`, `night_phase.py`)
2. **Night actions** — each player with a night ability makes an AI decision via bridge agent
3. **Day debate** — 6 AI players debate concurrently in rounds (`day_phase.py`)
4. **Vote** — each player votes to execute someone
5. **Resolve** — outcome determined by One Night Werewolf rules (`resolve_phase.py`)
6. **Postgame** — each player gives an in-character interview (`postgame_phase.py`)
7. **Translate** — logs translated to English (`translate_phase.py`)
8. **Publish** — archive rebuilt and pushed to GitHub Pages (`scripts/build_pages.py`)

---

## Data layout

```
data/
  games/game_XXXXXX/
    night_result.json
    day_result.json
    vote_result.json
    resolve_result.json
    postgame_result.json
    chat_history.md
    *_en.json / chat_history_en.md   ← English mirrors
docs/                                ← GitHub Pages site
```

---

## 中文說明

**一夜狼人 AI 自主模擬**，6 個 AI 玩家各自用唔同嘅 LLM，根據自己嘅角色記憶同場上即時對話做決策。

### 邊啲係 AI 決策，邊啲唔係

| 環節 | 決策者 |
|---|---|
| 發牌 / 角色分配 | 規則（隨機） |
| 夜晚行動（睇邊張牌、搶邊個身份） | **AI**，每個玩家根據角色同性格自主決定 |
| 白天辯論（講咩、點指控） | **AI**，6 個並發 thinker subagent |
| 投票 | **AI** |
| 勝負結算 | 規則（一夜狼人標準規則） |
| 賽後訪問 | **AI**，每個玩家用廣東話入戲回應 |
| 英文翻譯 | Google Translate API |

### 技術架構

整個遊戲由 cron script 定時觸發，唔係由 AI agent 自主發起。每個玩家的決策係透過 **bridge agent**（[OpenClaw](https://openclaw.ai) agent）呼叫對應 LLM 嘅 thinker subagent 完成。

呢個 project 依賴 OpenClaw 平台基建，唔可以喺冇該平台嘅環境下直接跑。
