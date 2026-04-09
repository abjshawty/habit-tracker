# Test Suite

Manual and automated tests for the Habit Tracker backend and frontend.

---

## 1. Database

| # | Test | Expected |
|---|------|----------|
| 1.1 | Run `init.sql` on a fresh DB | Tables `habits` and `logs` created without errors |
| 1.2 | Run `init.sql` a second time | No errors (all statements are idempotent via `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`) |
| 1.3 | Check seed data | `SELECT * FROM habits` returns Meditation, Exercise, Reading |
| 1.4 | Insert a duplicate habit name | Rejected with unique constraint violation |
| 1.5 | Insert a log with a non-existent `habit_id` | Rejected with foreign key violation |
| 1.6 | Insert two logs for the same `habit_id` + `date` | Second insert fails with primary key violation (upsert in the API handles this) |
| 1.7 | Delete a habit | Cascades — all related `logs` rows are removed |

---

## 2. `GET /api/habits`

| # | Test | Expected |
|---|------|----------|
| 2.1 | `GET /api/habits` with seed data, no logs | Returns 3 habits, all with `done: 0`, `total: 0` |
| 2.2 | `GET /api/habits` after toggling habit 1 today | Habit 1 has `done: 1` |
| 2.3 | `GET /api/habits` with logs older than 7 days | Old logs excluded — not counted in `done` or `total` |
| 2.4 | `GET /api/habits` response shape | Every item has `id` (int), `name` (string), `done` (int), `total` (int) |
| 2.5 | `POST /api/habits` | Returns `405 Method Not Allowed` |
| 2.6 | `GET /api/habits` with empty `habits` table | Returns `[]` (not `null` or 500) |

---

## 3. `POST /api/toggles`

| # | Test | Expected |
|---|------|----------|
| 3.1 | Toggle a valid habit on (`completed: true`) | Returns `204 No Content` |
| 3.2 | Toggle the same habit on again (repeat call) | Returns `204 No Content` — upsert, no duplicate error |
| 3.3 | Toggle a habit off (`completed: false`) | Returns `204`, `done` count decreases on next `GET /api/habits` |
| 3.4 | Toggle with a non-existent `habit_id` | Returns `500` (DB rejects the foreign key) |
| 3.5 | Request body is missing `habit_id` | Returns `400 Bad Request` |
| 3.6 | Request body is not valid JSON | Returns `400 Bad Request` |
| 3.7 | `GET /api/toggles` | Returns `405 Method Not Allowed` |
| 3.8 | Missing `Content-Type: application/json` header | Should still parse correctly or return `400` |

---

## 4. End-to-End Flow

| # | Test | Expected |
|---|------|----------|
| 4.1 | Full toggle cycle: GET → POST (on) → GET → POST (off) → GET | `done` increments then decrements correctly |
| 4.2 | Toggle all 3 seeded habits on, then `GET /api/habits` | All 3 habits show `done: 1` |
| 4.3 | Server restart mid-session | Data persists — logs survive restart (stored in DB, not memory) |

---

## 5. Infrastructure

| # | Test | Expected |
|---|------|----------|
| 5.1 | Start server without `DATABASE_URL` set | Server exits immediately with a clear fatal log |
| 5.2 | Start server with an unreachable DB | Server exits with connection error on startup |
| 5.3 | Kill the DB while the server is running | Individual requests return `500`; server stays up |
| 5.4 | Reconnect DB after it recovers | pgxpool re-establishes connections automatically; requests succeed again |
| 5.5 | `PORT` env var set to `9090` | Server listens on `:9090` |

---

## 6. Schema Auto-Apply

| # | Test | Expected |
|---|------|----------|
| 6.1 | Start server against a fresh empty DB | Tables and seed habits created automatically; `schema applied` logged |
| 6.2 | Start server against a DB that already has the schema | No errors — all statements are idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) |
| 6.3 | Start server against a DB that already has the schema and existing logs | Existing data untouched; server starts normally |
| 6.4 | Start server with a valid `DATABASE_URL` but a DB the user has no CREATE permission on | Server exits with a clear fatal log from schema apply step |
| 6.5 | `GET /api/habits` immediately after first startup | Returns the 3 seeded habits (Meditation, Exercise, Reading) without any manual SQL |

---

## 6. Frontend — Startup & Config

| # | Test | Expected |
|---|------|----------|
| 6.1 | `npm run web` with backend running | App loads in browser, habit list renders |
| 6.2 | `npm run web` with backend not running | App loads, list is empty, no crash — error logged to console |
| 6.3 | `EXPO_PUBLIC_API_URL` not set | Falls back to `http://localhost:8080` |
| 6.4 | `EXPO_PUBLIC_API_URL` set to machine local IP | App on physical device fetches data correctly |
| 6.5 | Android emulator with `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` | App fetches data correctly |

---

## 7. Frontend — Habit List

| # | Test | Expected |
|---|------|----------|
| 7.1 | App loads with 3 seeded habits | All 3 habits displayed, each with name + progress text |
| 7.2 | Progress text format | Shows `X/Y this week` (e.g. `0/0 this week` when no logs exist) |
| 7.3 | App loads with empty habits table | Empty list, no crash |
| 7.4 | Loading state | Spinner shown while initial fetch is in progress |
| 7.5 | Each habit has a toggle button | Button labelled "Done" when not toggled, "Undo" when toggled |

---

## 8. Frontend — Toggle Interaction

| # | Test | Expected |
|---|------|----------|
| 8.1 | Tap "Done" on a habit | `POST /api/toggles` fires with `completed: true`; list refreshes; button changes to "Undo" |
| 8.2 | Tap "Undo" on a toggled habit | `POST /api/toggles` fires with `completed: false`; list refreshes; button changes to "Done" |
| 8.3 | Tap "Done" while backend is unreachable | Error logged to console; list does not update; no crash |
| 8.4 | Rapid double-tap on toggle button | Second request fires after first; final state is consistent with last tap |
| 8.5 | Toggle updates the progress count | After tapping "Done", `done` count in progress text increments by 1 |

---

## 9. Frontend — Cross-Platform

| # | Test | Expected |
|---|------|----------|
| 9.1 | Web and mobile show identical habit list | Same data, same layout (minor platform styling differences are acceptable) |
| 9.2 | Toggle on web reflects on mobile after refresh | Both platforms read from the same DB — state is shared |
| 9.3 | App renders correctly in portrait orientation | No layout overflow or clipped elements |
| 9.4 | App renders on a small screen (320px width) | Habit name and button remain visible without horizontal scroll |
