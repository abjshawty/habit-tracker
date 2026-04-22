# Habit Tracker — Frontend

React Native mobile app built with Expo. Features an innovative circular ring interface for tracking daily habits.

---

## Stack

- **Expo 54** — toolchain and build system
- **React Native 0.81** — core UI components
- **react-native-svg** — vector graphics for ring visualization
- **@expo-google-fonts** — Caveat, Kalam, JetBrains Mono

---

## Project Structure

```
frontend/
├── App.js            # Root component + state management
├── index.js         # Expo entry point
├── app.json        # Expo config
├── babel.config.js
├── package.json
├── .env            # EXPO_PUBLIC_API_URL (not committed)
└── src/
    ├── RingScreen.js       # Main habit ring view
    ├── AddHabitScreen.js # Add new habits
    ├── HistoryScreen.js  # 4-week calendar view
    └── sketch.js         # Hand-drawn SVG components
```

---

## Screens

### RingScreen (Main)

- Circular arrangement of up to 8 habits
- Tap any node to toggle today's completion
- Shows progress arc and 7-day sparklines per habit
- Footer button to add habits or view history

### AddHabitScreen

- Mini ring preview showing habit positions
- Text input or starter habit pills
- 8-habit maximum limit

### HistoryScreen

- Week-by-week calendar grid (4 weeks)
- Navigation arrows to browse past weeks
- Checkmarks for completed days

---

## Configuration

The app reads the backend URL from an environment variable:

```
# .env
EXPO_PUBLIC_API_URL=http://192.168.1.9:8082
```

| Scenario | Value |
|----------|-------|
| Web (browser on same machine) | `http://localhost:8082` |
| Android emulator | `http://10.0.2.2:8082` |
| Physical device | `http://<your-machine-local-ip>:8082` |

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

### iOS simulator (Mac only)

```bash
npm run ios
```

### Physical device

```bash
npm start
```

Scan the QR code shown in the terminal. Ensure your phone and dev machine are on the same Wi-Fi.

---

## Design

### Colors

- **INK** (#1a1814) — Primary text
- **PAPER** (#f5f3ef) — Background
- **ACCENT** (#3d8c7c) — Completed/active states
- **MUTED** — Secondary text
- **FAINT** — Guidelines

### Typography

- **Caveat 700 Bold** — Headers, habit names
- **Kalam 400 Regular** — Body text, buttons
- **JetBrains Mono 400** — Labels, dates

### Hand-drawn SVG

All graphics use procedural SVG with seeded random for consistent hand-drawn aesthetic:

- `SketchCircle` — Imperfect circles
- `SketchHatch` — Cross-hatch fill
- `SketchCheck` — Hand-drawn checkmark

---

## Connecting to Backend

The backend must be running before the app displays data. See `backend/README.md` for setup.

```bash
# Start backend first
cd ../backend
go run main.go

# Then start frontend
cd frontend
npm run web  # or: npm start for device
```