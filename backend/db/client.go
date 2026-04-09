package db

import (
	"context"
	_ "embed"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed init.sql
var schema string

var Pool *pgxpool.Pool

func Init() {
	var err error
	Pool, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}

	if _, err = Pool.Exec(context.Background(), schema); err != nil {
		log.Fatalf("failed to apply schema: %v", err)
	}
	log.Println("schema applied")
}
