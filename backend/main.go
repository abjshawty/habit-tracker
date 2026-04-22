package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"habit-tracker/db"

	"github.com/joho/godotenv"
)

type Habit struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Done      int    `json:"done"`
	Total     int    `json:"total"`
	TodayDone bool   `json:"today_done"`
}

type ToggleRequest struct {
	HabitID   int  `json:"habit_id"`
	Completed bool `json:"completed"`
}

type AddHabitRequest struct {
	Name string `json:"name"`
}

type HabitHistory struct {
	ID   int             `json:"id"`
	Name string          `json:"name"`
	Log  map[string]bool `json:"log"` // "YYYY-MM-DD" → completed
}

func main() {
	_ = godotenv.Load()
	db.Init()
	defer db.Pool.Close()

	http.HandleFunc("/api/habits", habitsHandler)
	http.HandleFunc("/api/toggles", togglesHandler)
	http.HandleFunc("/api/history", historyHandler)
	http.HandleFunc("/docs", docsRedirectHandler)
	http.HandleFunc("/docs/", docsUIHandler)
	http.HandleFunc("/docs/openapi.json", openAPIHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// /api/habits — GET: list habits with week counts; POST: create a new habit
func habitsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listHabits(w, r)
	case http.MethodPost:
		addHabit(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func listHabits(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT h.id, h.name,
		       COUNT(*) FILTER (WHERE l.completed = TRUE)  AS done,
		       COUNT(*)                                     AS total,
		       COALESCE(
		         (SELECT completed FROM logs
		          WHERE habit_id = h.id AND date = CURRENT_DATE LIMIT 1),
		         FALSE
		       ) AS today_done
		FROM habits h
		LEFT JOIN logs l ON l.habit_id = h.id
		        AND l.date >= CURRENT_DATE - INTERVAL '6 days'
		GROUP BY h.id, h.name
		ORDER BY h.id
	`)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		log.Println("listHabits query:", err)
		return
	}
	defer rows.Close()

	var habits []Habit
	for rows.Next() {
		var h Habit
		if err := rows.Scan(&h.ID, &h.Name, &h.Done, &h.Total, &h.TodayDone); err != nil {
			http.Error(w, "scan error", http.StatusInternalServerError)
			return
		}
		habits = append(habits, h)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(habits)
}

func addHabit(w http.ResponseWriter, r *http.Request) {
	var req AddHabitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "bad request: name required", http.StatusBadRequest)
		return
	}

	var id int
	err := db.Pool.QueryRow(context.Background(),
		"INSERT INTO habits (name) VALUES ($1) RETURNING id", req.Name,
	).Scan(&id)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		log.Println("addHabit:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int{"id": id})
}

// POST /api/toggles — upserts a log entry for today
func togglesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ToggleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO logs (habit_id, date, completed)
		VALUES ($1, CURRENT_DATE, $2)
		ON CONFLICT (habit_id, date) DO UPDATE SET completed = EXCLUDED.completed
	`, req.HabitID, req.Completed)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		log.Println("togglesHandler exec:", err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/history — per-habit completion log for the last 28 days
func historyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Pool.Query(context.Background(), `
		SELECT h.id, h.name, l.date, l.completed
		FROM habits h
		LEFT JOIN logs l ON l.habit_id = h.id
			AND l.date >= CURRENT_DATE - INTERVAL '27 days'
			AND l.date <= CURRENT_DATE
		ORDER BY h.id, l.date
	`)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		log.Println("historyHandler:", err)
		return
	}
	defer rows.Close()

	habitMap := map[int]*HabitHistory{}
	var habitOrder []int

	for rows.Next() {
		var habitID int
		var name string
		var date *time.Time
		var completed *bool
		if err := rows.Scan(&habitID, &name, &date, &completed); err != nil {
			http.Error(w, "scan error", http.StatusInternalServerError)
			return
		}
		if _, ok := habitMap[habitID]; !ok {
			habitMap[habitID] = &HabitHistory{ID: habitID, Name: name, Log: map[string]bool{}}
			habitOrder = append(habitOrder, habitID)
		}
		if date != nil {
			habitMap[habitID].Log[date.Format("2006-01-02")] = completed != nil && *completed
		}
	}

	result := make([]HabitHistory, 0, len(habitOrder))
	for _, id := range habitOrder {
		result = append(result, *habitMap[id])
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func docsRedirectHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/docs" {
		http.NotFound(w, r)
		return
	}
	http.Redirect(w, r, "/docs/", http.StatusMovedPermanently)
}

func docsUIHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/docs/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(swaggerUIHTML))
}

func openAPIHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/docs/openapi.json" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(openAPISpec))
}

const swaggerUIHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Habit Tracker API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/docs/openapi.json",
      dom_id: "#swagger-ui"
    });
  </script>
</body>
</html>
`

const openAPISpec = `{
  "openapi": "3.0.3",
  "info": {
    "title": "Habit Tracker API",
    "version": "1.0.0",
    "description": "API for listing habits, creating habits, and toggling today's completion."
  },
  "servers": [
    {
      "url": "http://localhost:8082"
    }
  ],
  "tags": [
    { "name": "Habits", "description": "Habit management endpoints" },
    { "name": "Toggles", "description": "Habit completion tracking endpoints" },
    { "name": "History", "description": "Historical completion data" }
  ],
  "paths": {
    "/api/habits": {
      "get": {
        "tags": ["Habits"],
        "summary": "List habits",
        "description": "Returns all habits with 7-day completion counts and whether the habit is completed today.",
        "responses": {
          "200": {
            "description": "A list of habits",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/Habit"
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": ["Habits"],
        "summary": "Create a habit",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AddHabitRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Habit created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "integer",
                      "example": 4
                    }
                  },
                  "required": ["id"]
                }
              }
            }
          },
          "400": {
            "description": "Invalid request"
          },
          "500": {
            "description": "Database error"
          }
        }
      }
    },
    "/api/history": {
      "get": {
        "tags": ["History"],
        "summary": "Get completion history",
        "description": "Returns per-habit completion log for the last 28 days. Keys are ISO dates (YYYY-MM-DD); values are true (completed) or false (explicitly not completed). Dates with no log entry are omitted.",
        "responses": {
          "200": {
            "description": "History per habit",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/HabitHistory"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/toggles": {
      "post": {
        "tags": ["Toggles"],
        "summary": "Toggle today's completion",
        "description": "Upserts today's completion state for a habit.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ToggleRequest"
              }
            }
          }
        },
        "responses": {
          "204": {
            "description": "Toggle saved"
          },
          "400": {
            "description": "Invalid request"
          },
          "500": {
            "description": "Database error"
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Habit": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "example": 1
          },
          "name": {
            "type": "string",
            "example": "Meditation"
          },
          "done": {
            "type": "integer",
            "example": 3
          },
          "total": {
            "type": "integer",
            "example": 7
          },
          "today_done": {
            "type": "boolean",
            "example": true
          }
        },
        "required": ["id", "name", "done", "total", "today_done"]
      },
      "AddHabitRequest": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Read 20 minutes"
          }
        },
        "required": ["name"]
      },
      "HabitHistory": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "example": 1 },
          "name": { "type": "string", "example": "Meditation" },
          "log": {
            "type": "object",
            "description": "Map of ISO date to completion boolean",
            "additionalProperties": { "type": "boolean" },
            "example": { "2026-04-20": true, "2026-04-21": false }
          }
        },
        "required": ["id", "name", "log"]
      },
      "ToggleRequest": {
        "type": "object",
        "properties": {
          "habit_id": {
            "type": "integer",
            "example": 1
          },
          "completed": {
            "type": "boolean",
            "example": true
          }
        },
        "required": ["habit_id", "completed"]
      }
    }
  }
}
`
