# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a mono-repo containing independent projects. Each subdirectory is a self-contained project:

| Directory | Description |
|---|---|
| `hess-scraper/` | FastAPI web app for scraping Hess Hippo eSchool course content and backing up to Dropbox |
| `zhaoyun-red-cliffs-mvp/` | Side-scrolling action game MVP (趙雲赤壁), Vanilla JS + Canvas |
| `fe-triage-bot/` | Python Telegram bot (dependencies installed, source TBD) |
| `platform-enhancements/` | HTML prototypes and product proposals |
| `ai_idea_pool.html` | Standalone HTML idea board |

---

## hess-scraper

FastAPI backend (`main.py`) + Playwright scraper (`scraper.py`). Manages multi-account scraping of Hess course media (MP3/MP4) and parallel Dropbox backup.

**Run:**
```bash
cd hess-scraper
./start.sh           # or: .venv/bin/python main.py
# Opens at http://localhost:8001
```

**Install deps:**
```bash
cd hess-scraper
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/playwright install chromium
```

**Architecture:**
- `main.py` — All FastAPI routes + background task orchestration. Passwords encrypted at rest with Fernet (`data/.secret_key`). Scrape/backup states persisted to `data/*_state_*.json` so they survive restarts.
- `scraper.py` — Two-phase Playwright scraper: phase 1 crawls course structure, phase 2 intercepts media URLs.
- `backup_dropbox.py` / inline in `main.py` — Parallel 3-thread download → Dropbox upload. Deduplicates by file size check before re-uploading.
- `data/dropbox_config.json` — Fernet-encrypted Dropbox OAuth tokens (app key/secret/refresh token).

---

## zhaoyun-red-cliffs-mvp

Vanilla JS + HTML5 Canvas side-scroller (800×450). ES Modules — **must run via HTTP server, not `file://`**.

**Run game (required before tests):**
```bash
cd zhaoyun-red-cliffs-mvp/zhaoyun-mvp
python3 -m http.server 8080
# Open http://localhost:8080
```

**Run all tests** (server must be running first):
```bash
cd zhaoyun-red-cliffs-mvp
pip install pytest playwright && playwright install chromium
pytest tests/                          # all 23 tests
pytest tests/test_zhaoyun_mvp.py       # game integration tests only
pytest tests/pipeline/                 # sprite pipeline unit tests
pytest tests/test_zhaoyun_mvp.py::test_player_can_attack  # single test
```

**Run sprite pipeline:**
```bash
cd zhaoyun-red-cliffs-mvp
pip install -r pipeline/requirements.txt   # Pillow, numpy
python pipeline/run.py
```

**Architecture:**

*Game (`zhaoyun-mvp/src/game/`):*
- `main.js` — Entry point: game loop, `tick()`, mode switching (`title/running/paused/gameover/victory`)
- `state.js` — Single shared state object; all modules read/write this
- `config.js` — All tuning constants (speeds, hitbox sizes, animation frame counts)
- `renderer.js` — All canvas draw calls; parallax layers, sprites, HUD, screen shake
- `entities/` — `player.js`, `enemy-swordsman.js`, `enemy-spearman.js`; each exports an `update*()` function
- `combat.js` — Hit detection and damage resolution
- `level.js` — 4-segment belt-scroll level; unlocks next segment when enemies cleared

*Testing hooks exposed on `window`:*
- `window.render_game_to_text()` — returns JSON snapshot of game state
- `window.advanceTime(ms)` — deterministic frame advance
- `window.startGame()` / `window.renderNow()`

*Pipeline (`pipeline/`):*
Processes AI-generated sprite poseboards → aligned atlas frames. Key scripts: `align.py` (feet-alignment), `pack.py` (atlas packing), `snap.py` (frame extraction).

**Onboarding order for this project:** `README.md` → `docs/project-progress.md` → `docs/plans/` → source.
