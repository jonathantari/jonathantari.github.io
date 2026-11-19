# Typewriter backlog

## Writing timer / focus session — DONE
Built: `focus` button in the top bar (or Ctrl/Cmd+Shift+F) → pick 5/10/15/25. Timer sits faint in the bottom-right corner, steps by the minute, hover shows "end". Goes full screen on desktop; bell + "time" at the end, typing is never interrupted.

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
