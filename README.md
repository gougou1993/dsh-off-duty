# Off-duty bell

A fun scheduled off-work reminder plugin. Open the left "Off-duty bell" entry, set your time and messages, and a reminder pops up when the clock hits — with a slide-in animation, rotating messages, a chime and a check-in calendar. Pure Client plugin; settings and check-ins live in browser localStorage.

## Plugin Info

| Field | Value |
| --- | --- |
| Package | `@oakzhong/dsh-off-duty` |
| Version | `1.0.0` |
| Entry | `index.js` (Host, no-op) · `client.js` (Client) |
| Type | DSH bundle plugin, ES module (`"type": "module"`, `"private": false`, MIT) |
| Sidebar entry | Off-duty bell (left sidebar) |

## Features

### 1. Timing & triggers
- Set an off-work time (HH:mm); a reminder fires automatically.
- Optional "weekdays only" (Mon–Fri, silent on weekends).
- One-click enable/disable.
- Fires once per day; after check-in it will not fire again that day.
- "Later" snoozes the reminder by 15 minutes.

### 2. Custom messages & rotation
- Edit reminder messages in a multi-line box (one per line).
- Messages rotate in order when the bell rings, with a configurable interval (1–60 seconds).
- Five defaults included, e.g. "Are you ready? Go go go! 下班？" / "Are you ok?" / "今天也辛苦了，给你加个大鸡腿 🍗".

### 3. Animation & reminder style
- Animation: slide in from the right / fade / typewriter.
- Reminder style: top-right banner / fullscreen overlay.
- Sound: 6 Web Audio-synthesized chimes to choose from (chord / bell / ding / marimba / beep / off), no external audio file; click Try to preview.
- Confetti particles on check-in.

### 4. Check-in & stats
- "Clock out" records the day's check-in with a confetti burst.
- Check-in calendar (current month; checked days highlighted, today outlined).
- Stats: streak days, this-month count, total count.

### 5. Preview & test
- "Test reminder" / "Preview" buttons show the animation instantly without waiting for the configured time.
- Settings persist with "Save".

## Host API

None (Host half is a no-op); all logic is in the Client.

## Directory Structure

```
dsh-off-duty/
├── index.js              # Host half: no-op
├── client.js             # Client half: panel, timer, animation, sound, check-ins
├── cordis.patch.yml      # DSH bundle patch
├── icon.svg / icon.png   # Plugin icons
├── locale/               # zh.json / en.json metadata
├── package.json
├── README.md             # This document (English)
└── README.zh.md          # Chinese documentation
```

## Installation & Usage

1. Install this bundle into the target DSH profile and reload the Harness Web UI.
2. Open "Off-duty bell" in the left sidebar.
3. Set the time, edit messages, pick animation and reminder style, then click "Save".
4. The reminder fires at the set time; use "Test reminder" to preview instantly.
5. Click "Clock out" each day to build your streak.
