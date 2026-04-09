package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"habit-tracker/db"

	"github.com/joho/godotenv"
)

type Habit struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Done  int    `json:"done"`
	Total int    `json:"total"`
}

type ToggleRequest struct {
	HabitID   int  `json:"habit_id"`
	Completed bool `json:"completed"`
}

func main() {
	_ = godotenv.Load()
	db.Init()
	defer db.Pool.Close()

	http.HandleFunc("/api/habits", habitsHandler)
	http.HandleFunc("/api/toggles", togglesHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// GET /api/habits — returns all habits with done/total counts for today's week
func habitsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Pool.Query(context.Background(), `
		SELECT h.id, h.name,
		       COUNT(*) FILTER (WHERE l.completed = TRUE)  AS done,
		       COUNT(*)                                     AS total
		FROM habits h
		LEFT JOIN logs l ON l.habit_id = h.id
		        AND l.date >= CURRENT_DATE - INTERVAL '6 days'
		GROUP BY h.id, h.name
		ORDER BY h.id
	`)
	if err != nil {
		http.Error(w, "query error", http.StatusInternalServerError)
		log.Println("habitsHandler query:", err)
		return
	}
	defer rows.Close()

	var habits []Habit
	for rows.Next() {
		var h Habit
		if err := rows.Scan(&h.ID, &h.Name, &h.Done, &h.Total); err != nil {
			http.Error(w, "scan error", http.StatusInternalServerError)
			return
		}
		habits = append(habits, h)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(habits)
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
