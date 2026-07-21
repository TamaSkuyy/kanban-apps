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
