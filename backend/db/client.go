package db

import (
	"context"
	_ "embed"
	"errors"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed init.sql
var schema string

var Pool *pgxpool.Pool

func Init() {
	url := os.Getenv("DATABASE_URL")
	ensureDatabase(url)

	var err error
	Pool, err = pgxpool.New(context.Background(), url)
	if err != nil {
		log.Fatalf("unable to connect to database: %v", err)
	}

	if _, err = Pool.Exec(context.Background(), schema); err != nil {
		log.Fatalf("failed to apply schema: %v", err)
	}
	log.Println("schema applied")
}

// ensureDatabase connects to the postgres admin database and creates the
// target database if it does not already exist. PostgreSQL has no
// CREATE DATABASE IF NOT EXISTS syntax, so we create and swallow the
// "duplicate database" error (42P04) if it fires.
func ensureDatabase(url string) {
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		log.Fatalf("invalid DATABASE_URL: %v", err)
	}
	dbName := cfg.Database
	cfg.Database = "postgres"

	conn, err := pgx.ConnectConfig(context.Background(), cfg)
	if err != nil {
		log.Fatalf("could not connect to postgres admin db: %v", err)
	}
	defer conn.Close(context.Background())

	_, err = conn.Exec(context.Background(), "CREATE DATABASE "+pgx.Identifier{dbName}.Sanitize())
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "42P04" {
			return // already exists — nothing to do
		}
		log.Fatalf("could not create database %q: %v", dbName, err)
	}
	log.Printf("created database %q", dbName)
}

