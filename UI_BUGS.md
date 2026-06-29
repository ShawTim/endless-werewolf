# Endless Werewolf UI Bug Report

> Generated: 2026-06-29 by vision model E2E screenshot analysis
> Games tested: game_000001, game_000006
> Screenshots: landing, archive list, night, day, vote, resolve, postgame

## 🔴 Critical (2)

### C1. Vote arrows data mismatch
- **Location:** 3D scene (vote phase) vs right panel text
- **What:** 3D arrow shows The Underdog → The Prosecutor, but right panel text says The Underdog → The Chaos Agent
- **Data completely out of sync between visual and text representation**

### C2. Welcome overlay intercepts all clicks
- **Location:** `#welcome-overlay` covers entire page
- **What:** Archive, Info, Night buttons are all unclickable because welcome overlay intercepts pointer events even after it should be dismissed
- **Must force-dismiss via JS to access any UI**

## 🟠 Major (6)

### M1. Right panel clips 3D character models
- **Location:** Far right of 3D scene (The Therapist)
- **What:** Character model and nameplate cut off by right info panel
- **All phases affected**

### M2. Vote arrows render through 3D table
- **Location:** 3D scene (vote phase)
- **What:** Dashed grey arrows clip through the wooden table instead of routing over/around it. Solid arrowheads embed into character face models instead of stopping at edge

### M3. Postgame speech bubbles hidden behind left panel
- **Location:** 3D scene (postgame phase)
- **What:** The Statistician's speech bubble renders underneath the Game Archive panel — completely unreadable**

### M4. Speech bubbles overlap each other
- **Location:** 3D scene (postgame phase)
- **What:** The Underdog / The Statistician / The Gut Player bubbles stack on top of each other with no collision detection. Text is illegible**

### M5. Right panel has no scrollbar
- **Location:** Right info panel (postgame phase)
- **What:** Last interview card is cut off at bottom edge with no visible scrollbar. User has no indication there's more content**

### M6. Resolve panel shows raw variable names
- **Location:** Right panel (resolve phase)
- **What:**
  - Outcome: `no_team_win` instead of "No Team Wins"
  - Final Roles team: `(village_team)`, `(tanner)`, `(werewolf_team)` instead of formatted names
  - Winners field: blank instead of "None"

### M7. Archive list shows raw variable names
- **Location:** Left panel (archive list)
- **What:** Game outcomes displayed as `no_team_win`, `werewolf_win` — should be formatted as "No Team Wins", "Werewolf Team Wins"

## 🟡 Minor (8)

### m1. GitHub button has stray "X" character
- **Location:** Top right, GitHub button
- **What:** An "X" character overlaps the right border of the GitHub button

### m2. "AI ONE NIGHT" subtitle contrast too low
- **Location:** Top left, next to "ENDLESS WEREWOLF" logo
- **What:** Dark grey text on dark background, nearly invisible

### m3. Bottom phase bar "Postgame Interview" truncated
- **Location:** Bottom navigation bar, rightmost tab
- **What:** Text cut off as "Postgame Intervie..." — clipped by right panel

### m4. Night Actions shows raw action names
- **Location:** Right panel (night phase)
- **What:**
  - `inspect_center` instead of "Inspects Center"
  - `rob -> The Prosecutor` instead of "Robs The Prosecutor"

### m5. Day panel grammar: "X speaks"
- **Location:** Right panel (day phase), player stats
- **What:** "1 speaks", "2 speaks" — should be "1 speech / 2 speeches" or just numbers

### m6. Skybox visual tearing
- **Location:** 3D scene, top area (purple sky)
- **What:** Texture tearing/glitching visible in skybox

### m7. Nameplate positioning inconsistent
- **Location:** 3D scene, various characters
- **What:** Some nameplates float above head (correct), others overlap face model. The Gut Player and The Chaos Agent nameplates obstruct character models

### m8. The Chaos Agent faces away from table
- **Location:** 3D scene, bottom center character
- **What:** Character model appears to face outward while all others face inward toward the central candle/table

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Major | 7 |
| Minor | 8 |
| **Total** | **17** |

## Fix Priority

1. C2 (welcome overlay) — blocks all interaction
2. C1 (vote data mismatch) — wrong data displayed
3. M6 + M7 (raw variable names) — quick wins, formatting only
4. M1 (character clipping) — camera/viewport adjustment
5. M5 (scrollbar) — CSS fix
6. M3 + M4 (speech bubbles) — z-index + collision
7. M2 (vote arrows through table) — 3D routing
8. m1-m8 — polish pass