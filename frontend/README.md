# Habit Tracker — Frontend

React Native app built with Expo. Runs on iOS, Android, and web from a single codebase.

---

## Stack

- **Expo ~51** — toolchain and build system
- **React Native 0.74** — core UI components
- **React Native Web** — renders the same components in a browser
- **Expo Status Bar** — cross-platform status bar management

---

## Project Structure

```
frontend/
├── index.js          # Expo entry point — registers root component
├── App.js            # Entire UI: habit list, progress, toggle button
├── app.json          # Expo config (name, slug, platforms)
├── babel.config.js   # babel-preset-expo
├── package.json
└── .env              # EXPO_PUBLIC_API_URL (not committed)
```

---

## Configuration

The app reads the backend URL from an environment variable:

```
# .env
EXPO_PUBLIC_API_URL=http://localhost:8080
```

| Scenario | Value to set |
|----------|-------------|
| Web (browser on same machine) | `http://localhost:8080` |
| Android emulator | `http://10.0.2.2:8080` |
| Physical device (iOS or Android) | `http://<your-machine-local-ip>:8080` |

Expo exposes any variable prefixed with `EXPO_PUBLIC_` to the app bundle automatically — no extra config needed.

---

## Running the App

### Install dependencies

```bash
cd frontend
npm install
```

### Web

```bash
npm run web
```

Opens at `http://localhost:19006`.

### Android emulator

```bash
npm run android
```

Requires Android Studio with an emulator running.

### iOS simulator (Mac only)

```bash
npm run ios
```

Requires Xcode.

### Physical device

Install the **Expo Go** app on your phone, then:

```bash
npm start
```

Scan the QR code shown in the terminal.

> Make sure your phone and dev machine are on the same Wi-Fi network, and set `EXPO_PUBLIC_API_URL` to your machine's local IP.

---

## UI Overview

The app displays a list of all habits returned by `GET /api/habits`. For each habit:

- **Name** — habit label
- **Progress** — `done/total this week` (based on the last 7 days)
- **Toggle button** — taps `POST /api/toggles` to mark today as done or undo it; the list refreshes immediately after

There are no navigation screens, no settings, and no local state beyond what the API returns.

---

## Connecting to the Backend

The backend must be running before the app will display data. See `backend/README.md` for setup instructions. The app does not cache data — every screen load and every toggle hits the API live.
