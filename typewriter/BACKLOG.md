# Typewriter backlog

## Writing timer / focus session — DONE (redesigned Nov 2026)
Built: a little egg timer in the bottom-right corner, like one sitting on the table.

- Idle: a faint outline (opacity ~.12). Nothing else on screen.
- Running, not hovered: the dial at ~.3 with a soft wedge of ink that creeps back toward 12 o'clock every second (SVG circle with stroke-dasharray, 1 s linear transition). No numbers, no flashing.
- Hover (mouse) or tap (touch): the dial grows to ~72 px; the wedge fades almost out and the time left (m:ss) shows in calm grey in the centre of the dial. Quiet grey text links sit to its left: "5 min / 10 min / 25 min" when idle, "+5 min / end" while running. Move away and it all shrinks back; the numbers disappear.
- End: soft bell, the dial empties and "breathes" twice, centre reads "done" on hover, back to idle after ~14 s. Typing is never interrupted.
- Focus (browser full screen, desktop only) lives in the options panel and on Ctrl/Cmd+Shift+F. Esc leaves full screen only.

Design rules for anything timer-related (keep these when changing it):
- No white panels, cards, popovers or backgrounds around the timer. It is text and a line drawing on the paper, nothing more.
- Colours come from var(--ink) at low opacity and var(--hud) for text, so it works on day and night paper.
- Motion is slow and continuous (grow/shrink ~.45 s, ink creeps per second). No step "swap" blinks, no badges, no counters outside the dial.
- No stats, streaks or history.

Original brief:
A calm way to set a timer for a few minutes and write without distractions. It should feel like a writer's tool, not a productivity app.

- Feel: something like an e-ink display. Quiet, low contrast, no ticking seconds or flashing. Changes in steps (e.g. minutes left) rather than a running countdown.
- Setup: pick a short length (e.g. 5 / 10 / 15 / 25 min) in one or two taps. Nothing to configure beyond that.
- During a session: true full screen, so the browser's own tabs, address bar and the rest of the desktop are gone (browser Fullscreen API). The app's own options keep working as today and appear when you hover over them. The timer sits quietly at the edge, or is hidden until you look for it.
- Notifications: a web page can't silence system notifications. At most, show a one-line hint when a session starts to turn on Focus / Do Not Disturb (macOS, iOS).
- Full screen is a desktop feature. On mobile the timer works the same but there's no full screen (low priority; opening from the home screen already hides most browser bars).
- Ending: a gentle signal, like a soft bell from the machine sounds or a slow fade. Never stops you mid-sentence; you keep typing if you want.
- Keep it simple: no stats, streaks or history.

## Auto-save
Never lose writing, without having to think about saving. Today the draft is kept in the browser (localStorage) and the file is only written when you press save.

- Where it saves: once a file has been saved or opened (a file handle exists), write changes back to that same .md file automatically after a pause in typing (e.g. a few seconds idle), so the file on disk is always current. Chromium-based browsers only (File System Access API).
- Before a file exists: keep today's browser draft. Don't pop up a save dialog on its own. A first manual save (or "save as") is what links the document to a file and turns auto-save on.
- Where there's no file access (Safari, Firefox, mobile, the preview iframe): the browser draft stays the safety net. No repeated downloads.
- Feel: silent. No toast on every save. The existing dot next to the file name already shows unsaved changes; it just clears itself. Show a small message only if saving fails (permission lost, file moved) and fall back to the draft.
- Permission: the browser may need re-permission to write to a remembered file after a reload. Ask once, on the next manual save, rather than nagging.
- Extras: also save when the tab is hidden or closed (visibilitychange / pagehide).
- Option: an "Auto-save" on/off row in options (default on), no other settings.
- Keep it simple: no version history, no backups folder.

## Performance — keep typing under ~50 ms
- The lamp-lit layers (`#texLit`, `#lit`) are a lamp-sized window moved with `transform`, with their content counter-moved so it stays put. Never animate a mask position or a CSS variable on `:root` per frame: that re-rasterized the SVG paper texture every frame and made each keystroke take ~250 ms on an M2.
- `--gx/--gy/--ex/--ey` (glyph shading) are written only when they change by half a character / 4 px; every span under the lamp restyles when they change.
- The animation loop skips all DOM writes when nothing moved.
