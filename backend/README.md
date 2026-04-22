# Habit Tracker — Backend

Go HTTP server backed by PostgreSQL. Provides REST API for habit management and completion tracking.

---

## Stack

- **Go 1.26** — `net/http` standard library
- **PostgreSQL** — two tables: `habits`, `logs`
- **pgx v5** — connection pooling
- **godotenv** — loads `.env` for local development

---

## Project Structure

```
backend/
├── main.go        # HTTP handlers + embedded OpenAPI spec
├── .env           # Environment variables (not committed)
├── go.mod
├── go.sum
└── db/
    ├── client.go  # pgxpool initialization + auto-create database
    └── init.sql  # Schema + seed data
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/habits` | List habits with 7-day completion counts + today_done |
| POST | `/api/habits` | Create a new habit |
| POST | `/api/toggles` | Toggle today's completion for a habit |
| GET | `/api/history` | Get 28-day completion log per habit |
| GET | `/docs/openapi.json` | OpenAPI 3.0 spec (JSON) |
| GET | `/docs/` | Swagger UI |

### GET /api/habits

Returns all habits with completion counts for the past 7 days and today's status.

**Response**
```json
[
  { "id": 1, "name": "Meditation", "done": 3, "total": 7, "today_done": true },
  { "id": 2, "name": "Exercise",   "done": 1, "total": 7, "today_done": false },
  { "id": 3, "name": "Reading",    "done": 5, "total": 7, "today_done": true }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Habit ID |
| `name` | string | Habit name |
| `done` | int | Days completed in the last 7 days |
| `total` | int | Total days in the last 7 days |
| `today_done` | bool | Whether completed today |

### POST /api/habits

Create a new habit.

**Request**
```json
{ "name": "Walk" }
```

**Response** — `201 Created`
```json
{ "id": 4 }
```

### POST /api/toggles

Toggle today's completion. Uses UPSERT — calling again flips the state.

**Request**
```json
{ "habit_id": 1, "completed": true }
```

**Response** — `204 No Content`

### GET /api/history

Returns 28-day completion log per habit.

**Response**
```json
[
  { "id": 1, "name": "Meditation", "log": { "2026-04-20": true, "2026-04-21": false } },
  { "id": 2, "name": "Exercise",   "log": { "2026-04-20": true } }
]
```

---

## Database Schema

```sql
CREATE TABLE habits (
    id   SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE logs (
    habit_id  INT  REFERENCES habits(id) ON DELETE CASCADE,
    date     DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (habit_id, date)
);
```

Default seeds: Meditation, Exercise, Reading

---

## Setup & Running

### 1. Start PostgreSQL

```bash
docker run --rm \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  postgres
```

### 2. Configure environment

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/habits
PORT=8082
```

### 3. Run the server

```bash
go run main.go
```

Server starts on `http://localhost:8082`. The schema is embedded and applied automatically on startup.

---

## Testing

```bash
# List habits
curl http://localhost:8082/api/habits

# Create a habit
curl -X POST http://localhost:8082/api/habits \
  -H "Content-Type: application/json" \
  -d '{"name": "Floss"}'

# Toggle today's completion
curl -X POST http://localhost:8082/api/toggles \
  -H "Content-Type: application/json" \
  -d '{"habit_id": 1, "completed": true}'

# Get history
curl http://localhost:8082/api/history

# Open Swagger UI
# http://localhost:8082/docs/
```