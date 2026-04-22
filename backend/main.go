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
