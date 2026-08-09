package main

import (
	"context"
	"log/slog"
	"os"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	db, err := NewDBFromEnv(context.Background())
	if err != nil {
		slog.Error("failed to connect database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if os.Getenv("RUN_MIGRATIONS") == "1" {
		slog.Info("running migrations")
		files, _ := os.ReadDir("migrations")
		for _, f := range files {
			if len(f.Name()) > 7 && f.Name()[len(f.Name())-7:] == ".up.sql" {
				b, _ := os.ReadFile("migrations/" + f.Name())
				if _, err := db.Exec(context.Background(), string(b)); err != nil {
					slog.Warn("migration failed", "file", f.Name(), "error", err)
				} else {
					slog.Info("migration applied", "file", f.Name())
				}
			}
		}
	}

	r := NewRouter(db)

	addr := os.Getenv("BACKEND_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	slog.Info("starting backend", "addr", addr)
	if err := r.Run(addr); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
