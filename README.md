# AI One Night Ultimate Werewolf 🐺

全天候自動運行的 AI 一夜狼人殺引擎。
6 個固定性格的 AI 玩家互相算計，對話日誌將自動發佈至 GitHub Pages。

## 核心機制
1. **身份池**: 9 張牌 (包含狼人、神職、皮匠等)。
2. **異步討論**: 玩家不按順序發言，而是在每輪讀取歷史紀錄後，自行決定是否「搶答 (Speak)」或「靜觀其變 (Pass)」。
3. **黑盒夜晚**: 強盜和搗蛋鬼的技能在後台結算，AI 醒來時只能靠推理得知自己是否被換牌。

## GitHub Pages archive
- Pages root: `docs/`
- Build archive index + copy completed games:
  - `python3 scripts/build_pages.py`
- Publish（commit+push updated docs and game data）:
  - `bash scripts/publish_pages.sh`
- Browser UI:
  - `docs/index.html`
  - 可瀏覽每場 night/day/vote/resolve 同完整 chat log

## State management
- Per-game immutable state: `data/games/game_XXXXXX/`
- Current pointer: `data/current_game.json`
- Counter: `data/game_counter.json`
- Legacy compatibility files remain in `data/state/`
