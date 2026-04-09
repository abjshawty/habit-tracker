# Habit Tracker — Backend

Go HTTP server backed by PostgreSQL. Exposes two endpoints for reading habit progress and toggling daily completions.

---

## Stack

- **Go 1.22+** — `net/http` standard library (no framework)
- **PostgreSQL 13+** — two tables: `habits`, `logs`
- **pgx v5** — connection pooling
- **godotenv** — loads `.env` for local development

---

## Project Structure

```
backend/
├── main.go        # HTTP server + request handlers
├── .env           # Local environment variables (not committed)
├── go.mod
├── go.sum
└── db/
    ├── client.go  # pgxpool initialization
    └── init.sql   # Schema creation + seed data
```

---

## API

### `GET /api/habits`

Returns all habits with completion counts for the past 7 days.

**Response**
```json
[
  { "id": 1, "name": "Meditation", "done": 3, "total": 7 },
  { "id": 2, "name": "Exercise",   "done": 1, "total": 7 },
  { "id": 3, "name": "Reading",    "done": 5, "total": 7 }
]
```

| Field   | Type   | Description                              |
|---------|--------|------------------------------------------|
| `id`    | int    | Habit ID                                 |
| `name`  | string | Habit name                               |
| `done`  | int    | Days marked complete in the last 7 days  |
| `total` | int    | Total log entries in the last 7 days     |

---

### `POST /api/toggles`

Upserts a log entry for today. Sending `completed: false` undoes a toggle.

**Request body**
```json
{ "habit_id": 1, "completed": true }
```

**Response** — `204 No Content` on success.

---

## Database Schema

```sql
CREATE TABLE habits (
    id   SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE logs (
    habit_id  INT  REFERENCES habits(id) ON DELETE CASCADE,
    date      DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (habit_id, date)
);
```

The `PRIMARY KEY (habit_id, date)` constraint ensures one log entry per habit per day, making toggles safe to call multiple times.

---

## Setup & Running

### 1. Start PostgreSQL

```bash
docker run --rm \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=habitdb \
  postgres
```

### 2. Apply the schema (run once)

```bash
docker exec -i <container_id> psql -U postgres habitdb < db/init.sql
```

Or connect with any Postgres client and paste `db/init.sql` manually.

### 3. Configure environment

Copy `.env` and adjust if needed:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/habitdb
PORT=8080
```

### 4. Run the server

```bash
go run main.go
```

Server starts on `http://localhost:8080`.

---

## Quick Smoke Test

```bash
# List habits
curl http://localhost:8080/api/habits

# Mark habit 1 as done today
curl -X POST http://localhost:8080/api/toggles \
  -H "Content-Type: application/json" \
  -d '{"habit_id": 1, "completed": true}'

# Confirm the count updated
curl http://localhost:8080/api/habits
```
