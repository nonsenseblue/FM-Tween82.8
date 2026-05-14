# Tween 82.8

**An FM radio between reality and dreams.**

> *82.8 MHz doesn't exist. That's the point.*

Live: <https://tween828.pages.dev/>

---

## What is Tween 82.8?

A genre-based BGM player wrapped in a Windows 95 desktop.
44 channels. No ads. No login. Just press play.

- **Tween** — *between*. The space in between.
- **82.8** — The solar system orbits the galaxy at 828,000 km/h.
  A cosmic speed, reimagined as an FM frequency.

---

## Features

| Feature | Description |
|---|---|
| **FM Player** | 44 genre channels via the YouTube IFrame API |
| **Guestbook** | Listener messages, like postcards to a radio station |
| **Inbox** | Private mailbox with admin authentication |
| **Pomodoro** | Work timer with genre-switching breaks |
| **Weather** | Forecast for Tween City (the city is fictional too) |
| **Todo** | Notepad-style task list |
| **MS-DOS Terminal** | A stream of memories from the late 90s |
| **Desktop Cat** | A pixel cat that walks, eats, stretches, and grooves to the music |
| **Control Panel** | Desktop themes and language switching |
| **My Computer** | A C: drive with README.txt and a hidden `signal_log.txt` |
| **Recycle Bin** | Files that can't be restored — by design |

---

## Design Philosophy

The Windows 95 shell is not nostalgia bait.

People who listened to FM radio late at night were the same people sitting
in front of CRTs. The UI and the content share the same emotional register.
It's not a skin — it's the same wavelength.

Every filename tells a story. Every extension is a metaphor.

### My Documents — scenes you kept

```
3am_drive.txt       — a drive with no destination, radio tuned to 82.8
summer_1999.txt     — the last summer before growing up
frequency_log.txt   — a night spent chasing signals
last_night.txt      — couldn't sleep. turned on the radio. felt better.
playlist.m3u        — hidden in Documents. it's private.
swordfish_II.log    — flight log. no destination. fuel remaining.
modal_soul.pls      — play count: infinity. last played: late night, always late night.
section9.bat        — all members connected. the net is vast and infinite.
champloo.mix        — BPM: undefined. Genre: everything, mixed.
```

### Recycle Bin — things that can't come back

```
youth.exe       — a process that was running. tried to delete it. couldn't.
あの夏.mp3      — corrupted. but the melody still plays in your head.
夢の続き.txt    — tried to write the rest. couldn't find the words.
luv_sic.tmp     — created 2010-02-26. artist not found. rest in beats.
```

Marked as "cannot restore." Not an easter egg — narrative.

### C:\\signal_log.txt

For those who dig deeper — reception logs from frequencies that don't
exist. References only some people will recognise. No copyrights touched.

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | HTML / CSS / JavaScript — no frameworks |
| **Hosting** | Cloudflare Pages |
| **Database** | Cloudflare D1 (SQLite) |
| **Player** | YouTube IFrame API |
| **Weather** | Open-Meteo API |
| **PWA** | Service Worker + Web App Manifest |
| **i18n** | Japanese / English |
| **Media Session** | Lock-screen controls + background playback |

---

## Setup

```bash
# Install Wrangler
npm install -g wrangler

# Create the D1 database
wrangler d1 create tween-guestbook

# Create tables
wrangler d1 execute tween-guestbook --remote --command \
  "CREATE TABLE IF NOT EXISTS messages (
     id   INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL DEFAULT '名無しリスナー',
     msg  TEXT NOT NULL,
     ts   TEXT NOT NULL DEFAULT (datetime('now'))
   );"

wrangler d1 execute tween-guestbook --remote --command \
  "CREATE TABLE IF NOT EXISTS inbox (
     id      INTEGER PRIMARY KEY AUTOINCREMENT,
     name    TEXT NOT NULL DEFAULT '名無しリスナー',
     subject TEXT NOT NULL,
     body    TEXT NOT NULL,
     unread  INTEGER NOT NULL DEFAULT 1,
     ts      TEXT NOT NULL DEFAULT (datetime('now'))
   );"

# Set the inbox admin token
wrangler pages secret put INBOX_TOKEN

# Deploy
wrangler pages deploy .
```

---

## License

MIT

---

*82.8 MHz — between reality and dreams.*
