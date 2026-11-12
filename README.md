# HoofTrack (demo)

A mobile-first PWA that replaces the hoof trimmer's paper notebook: which cows were trimmed, what was found on each foot and claw, and when each cow needs a recheck. All data stays on the device (IndexedDB). There is no login and no server.

## Live app (GitHub Pages)

**https://battabox.github.io/hooftrack/**

Each push to `main` builds and deploys the app automatically (`.github/workflows/deploy.yml`). The repo's Actions tab shows progress, which takes about 1–2 minutes.

### Install on a phone from the live link

The live link uses HTTPS, so the installed app **works fully offline** in the barn.

- **iPhone:** open the link in **Safari** (not Chrome). Tap **Share** (square with arrow), then **Add to Home Screen**, then **Add**.
- **Android:** open the link in **Chrome**. Tap **⋮**, then **Install app** (or **Add to Home screen**).

Open HoofTrack once while online after installing so it can store itself for offline use. After that it works without signal.

Data stays on the phone and is not uploaded. Use **Settings → Export** for backups. If iPhone storage runs low, Safari can delete data from web apps that haven't been opened for a long time, so export a backup regularly.

### If the repo is not called `hooftrack`

Change `BASE` in `vite.config.ts` to `/<your-repo-name>/` and push again.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # development server, also reachable from your phone on the same Wi-Fi
npm test           # unit tests (next-check dates, duplicate cows, farm isolation)
npm run build      # production build into dist/
npm run preview    # serve the production build (with offline service worker) on port 4173
```

Both `dev` and `preview` print a **Network** address that ends in `/hooftrack/`, for example `http://192.168.1.20:4173/hooftrack/`.

## Open it on a phone

1. Connect the phone to the **same Wi-Fi** as the computer.
2. Open the Network address in Safari (iPhone) or Chrome (Android).
3. If the page won't load, allow Node.js through Windows Firewall on "Private networks".

### Install on the home screen

- **iPhone (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** tap ⋮, then **Add to Home screen** (or **Install app**).

> Full offline mode needs **HTTPS** because browsers only run service workers on secure pages. Over a plain `http://192.168.x.x` address the app works and can be added to the home screen, but it won't open without the computer running. For real offline use, host the `dist/` folder on any HTTPS static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages) and install it from there.

## Features at a glance

- **Controles / Due:** rechecks that are overdue, due this week or due next week.
- **Bekappen / To trim:** the farm puts cows on a list (paste numbers, one per line). The trimmer ticks each one **✓ Trimmed** or **✗ Not possible**. Use **Share list** to send the numbers by WhatsApp; the other phone pastes them in.
  - **🎤 Speak numbers:** say "1234 and 5678" (or "1234 en 5678"). This uses the phone's own speech recognition, so it needs internet, and the audio is processed by Google (Android) or Apple (iPhone).
  - **📷 Photo of ear tag:** the number is read on the phone itself, and the numbers it finds appear as buttons to tap. The first use downloads the text reader (about 3 MB), so it needs internet once.
  - Numbers from voice or photo are never added on their own: they go into the text box so they can be checked first.
- **Trim record:** foot, claw, problem, severity, treatment and recheck in a few taps, with undo.
- **Cow history:** every visit, plus a flag when the same problem was recorded twice on the same foot.
- **Delete:** a visit, a cow or a farm, each with a confirmation and Undo.
- **Language:** English or Nederlands (Settings → Language / Taal). Phones set to Dutch start in Dutch.

## How it is built

- Vite, React, TypeScript, Tailwind CSS v4, vite-plugin-pwa
- `src/data/`: the data layer. Dexie/IndexedDB lives here only. The UI calls the `Repo` functions in `repo.ts` and the hooks in `hooks.ts`, so a cloud backend can replace it later. Every read takes a `farmId`, so one farm never sees another farm's data.
- `src/lib/dates.ts`: dates are stored as calendar days (`YYYY-MM-DD`). "Today" is taken from the **Europe/Amsterdam** time zone. Week arithmetic is done on calendar days, so month ends, year ends and daylight saving changes can't shift a date.
- Problem and treatment lists are stored as data and can be edited in Settings.
- The app only records what the trimmer taps. It does not diagnose or suggest treatments. The "repeat" flag on a cow means the same problem was *recorded* on the same foot 2 or more times.

## Not included yet

- Login and user accounts
- Cloud sync and backup between devices (a manual JSON export/import is available)
- Notifications and reminders for due rechecks
- Photos of feet or claws
- Multiple trimmers sharing a farm, roles or permissions
- Reports and printing, editing past visits (a wrong visit can be deleted and recorded again)
