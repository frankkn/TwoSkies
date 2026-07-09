<div align="right">

**English** | [繁體中文](README.zh-TW.md)

</div>

# TwoSkies ☔ 兩片天空

**One screen, two skies — yours below, theirs above. The only interaction is a once-a-day quiet tap: "I came to see your sky."**

🔗 Live: **https://twoskies.web.app**

## How to use

### Android
1. Download [app-twoskies.apk (latest)](https://github.com/frankkn/TwoSkies/releases/latest/download/app-twoskies.apk)
2. On your phone, allow installs from unknown sources (Settings → Security)
3. Open the downloaded APK to install, then sign in with Google

### iOS (Add to Home Screen)
1. Open [https://twoskies.web.app](https://twoskies.web.app) in **Safari**
2. Tap the **Share** button ↑ → choose **Add to Home Screen**
3. Tap **Add** — a TwoSkies icon appears on your home screen and works like an app

### Web
Just open [https://twoskies.web.app](https://twoskies.web.app) in any browser.

## What is this

You're standing under a clear Taipei afternoon, and on the same screen, London is raining on someone you care about.

TwoSkies is built on one idea: **no chat, but knowing each other's sky**. Everything that is known is volunteered — where you are (city-level, on purpose), and whether you came to look today. Nothing else.

Before pairing, it's just a quiet weather app for one. When someone redeems your invite, the screen grows a second sky.

### The rules (non-negotiable)

- **A pair is exactly two people.** One invite code, one redemption, one pair at a time
- **Looking is silent.** Opening the app to watch their sky leaves no trace — no read receipts, ever
- **Checking in is deliberate.** Once a day you may tap "I came to see your sky." The other person sees a soft line — "{nickname} came to see your sky" — the next time *they* open the app. Tapped means tapped: it can't be taken back. Not tapped means not tapped: no makeups, no reminders
- **"Today" follows the tapper's own timezone**, so date lines don't play tricks across hemispheres
- **No history.** The UI only ever shows today; check-ins are deleted by Firestore TTL after 48 hours. "No history" is a promise kept by infrastructure, not a UI pretending
- **Either person can end it.** Unpairing deletes everything immediately — no reason required, no notification sent. Honesty includes endings
- **No chat, no streaks, no push notifications.** The only way to know they came is to open it yourself

## The weather

Each sky shows live conditions (rendered as slow, quiet animation — drifting clouds, falling rain, twinkling stars, sun and moon by that city's own daylight), current temperature with today's high/low, a 24-hour hourly strip, and a 7-day forecast with iPhone-style temperature range bars — all on a frosted glass card, all in **that place's local clock**. Their 8 PM is your view of their evening.

Weather data comes from [Open-Meteo](https://open-meteo.com) — free, no API key, queried straight from the browser.

## Honesty as infrastructure

The product's promises are enforced by Firestore Security Rules, not by good intentions:

- **Coordinates are coarsened to 0.1° (~10 km)** — validated mathematically in rules; precise location can't be written even by a modified client
- **Field whitelists on every document** — no smuggling a chat through spare fields
- **Check-ins are create-only** with server-timestamped IDs; deleting one is impossible while the pair exists
- **Invites expire within 24 hours** (rules-capped) and must be consumed atomically in the same transaction that joins the pair
- **One pair per person** is enforced transactionally with `getAfter`

All of it is covered by 33 emulator tests (`npm run test:rules`).

## Tech

- **Vite + React + TypeScript + Tailwind CSS v4**
- **Firebase**: Google sign-in, Firestore (realtime sync via `onSnapshot`), Hosting, App Check — no custom backend at all
- **Open-Meteo** for weather and city geocoding
- **Capacitor** wraps the same React codebase into the Android APK (Google sign-in goes
  native on Android; everything else shares the web data path); pushing a `v*` tag makes
  GitHub Actions build, sign, and publish it to Releases

## Local development

```bash
npm install

# UI prototype with fake pair data (no Firebase needed)
VITE_USE_MOCK=1 npm run dev

# Full stack against local emulators
npm run emulators                  # Auth :9099 + Firestore :8080
VITE_USE_EMULATORS=1 npm run dev

# Security Rules test suite (33 tests)
npm run test:rules
```

To run against a real Firebase project, copy `.env.example` to `.env.local` and fill in your web app config.

## Deliberately not building

Chat, messages, photos, read receipts, streaks, history, push notifications, precise location, movement trails (only "where now", never "where you've been"), third people, groups, and any engagement optimization.

The weather is always there. Whoever wants to look will come.
