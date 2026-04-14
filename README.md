# Tween 82.8

**FM 82.8 MHz --- An FM radio between reality and dreams.**

> 現実と夢の狭間に流れるFMラジオ。
> 大人になる前の夜に聴いていた、あの周波数。

---

## What is Tween 82.8?

A genre-based BGM player wrapped in a Windows 95 desktop.
44 channels. No ads. No login. Just press play.

**Tween** = between (the space in between)
**82.8** = The solar system orbits the galaxy at 828,000 km/h. A cosmic speed, reimagined as an FM frequency. 82.8 MHz doesn't exist. That's the point.

**[tween828.pages.dev](https://tween828.pages.dev/)**

---

## Features

| Feature | Description |
|---------|-------------|
| **FM Player** | 44 genre channels via YouTube API |
| **Guestbook** | Listener messages, like postcards to a radio station |
| **Inbox** | Private mailbox with admin authentication |
| **Pomodoro** | Work timer with genre-switching breaks |
| **Weather** | Tween City forecast (the city is fictional too) |
| **Todo** | Notepad-style task list |
| **MS-DOS Terminal** | A stream of memories from the late 90s |
| **Desktop Cat** | Pixel cat that walks, eats, stretches, and grooves to music |
| **Control Panel** | Desktop color themes and language switching |
| **My Computer** | Drive view with README.txt and hidden signal_log.txt |
| **Recycle Bin** | Files that can't be restored. By design. |

---

## Design Philosophy

The Windows 95 shell is not nostalgia bait.
People who listened to FM radio late at night were the same people sitting in front of CRTs.
The UI and the content share the same emotional register. It's not a skin.

Every filename tells a story. Every extension is a metaphor.

**My Documents** --- scenes you kept:
- `3am_drive.txt` --- a drive with no destination, radio tuned to 82.8
- `summer_1999.txt` --- the last summer before growing up
- `frequency_log.txt` --- a night spent chasing signals
- `last_night.txt` --- couldn't sleep. turned on the radio. felt better.
- `playlist.m3u` --- hidden in Documents, not on the desktop. because it's private.
- `swordfish_II.log` --- flight log. no destination. fuel remaining.
- `modal_soul.pls` --- play count: infinity. last played: late night, always late night.
- `section9.bat` --- all members connected. the net is vast and infinite.
- `champloo.mix` --- BPM: undefined. Genre: everything mixed.

**Recycle Bin** --- things that can't come back:
- `youth.exe` --- a process that was running. tried to delete it. couldn't.
- `あの夏.mp3` --- corrupted. but the melody still plays in your head.
- `夢の続き.txt` --- tried to write the rest. couldn't find the words.
- `luv_sic.tmp` --- a temporary file. created 2010-02-26. artist not found. rest in beats.

Marked as "cannot restore." That's not an easter egg. It's narrative.

**C:\signal_log.txt** --- for those who dig deeper:
- Reception logs from frequencies that don't exist.
- References only some people will recognize. No copyrights touched.

---

## Tech Stack

| | |
|---|---|
| **Frontend** | HTML / CSS / JavaScript (no frameworks) |
| **Hosting** | Cloudflare Pages |
| **Database** | Cloudflare D1 (SQLite) |
| **Player** | YouTube IFrame API |
| **Weather** | Open-Meteo API |
| **PWA** | Service Worker + Web App Manifest |
| **i18n** | Japanese / English |
| **Media Session** | Lock screen controls + background playback |

---

## Setup

```bash
# Install Wrangler
npm install -g wrangler

# Create D1 database
wrangler d1 create tween-guestbook

# Create tables
wrangler d1 execute tween-guestbook --remote --command "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '名無しリスナー', msg TEXT NOT NULL, ts TEXT NOT NULL DEFAULT (datetime('now')));"

wrangler d1 execute tween-guestbook --remote --command "CREATE TABLE IF NOT EXISTS inbox (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL DEFAULT '名無しリスナー', subject TEXT NOT NULL, body TEXT NOT NULL, unread INTEGER NOT NULL DEFAULT 1, ts TEXT NOT NULL DEFAULT (datetime('now')));"

# Set inbox admin token
wrangler pages secret put INBOX_TOKEN

# Deploy
wrangler pages deploy .
```

---

## License

MIT

---

*82.8 MHz --- between reality and dreams*
