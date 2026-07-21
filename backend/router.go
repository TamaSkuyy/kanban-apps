package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/time/rate"
)

type Board struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Columns   []Column  `json:"columns,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Column struct {
	ID        string    `json:"id"`
	BoardID   string    `json:"board_id"`
	Title     string    `json:"title"`
	Position  int       `json:"position"`
	Tasks     []Task    `json:"tasks,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Task struct {
	ID          string     `json:"id"`
	ColumnID    string     `json:"column_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Assignee    string     `json:"assignee"`
	DueDate     *time.Time `json:"due_date"`
	Position    int        `json:"position"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     rate.Limit
	burst    int
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type sseHub struct {
	mu       sync.RWMutex
	watchers map[string]map[chan []byte]struct{}
}

func newSSEHub() *sseHub {
	return &sseHub{watchers: map[string]map[chan []byte]struct{}{}}
}

func (h *sseHub) subscribe(boardID string) chan []byte {
	ch := make(chan []byte, 8)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.watchers[boardID] == nil {
		h.watchers[boardID] = map[chan []byte]struct{}{}
	}
	h.watchers[boardID][ch] = struct{}{}
	return ch
}

func (h *sseHub) unsubscribe(boardID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.watchers[boardID] == nil {
		return
	}
	delete(h.watchers[boardID], ch)
	close(ch)
	if len(h.watchers[boardID]) == 0 {
		delete(h.watchers, boardID)
	}
}

func (h *sseHub) publish(boardID string, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.watchers[boardID] {
		select {
		case ch <- payload:
		default:
		}
	}
}

func newRateLimiter() *rateLimiter {
	rl := &rateLimiter{
		visitors: map[string]*visitor{},
		rate:     5,
		burst:    15,
	}
	go rl.cleanup()
	return rl
}

func (r *rateLimiter) getLimiter(ip string) *rate.Limiter {
	r.mu.Lock()
	defer r.mu.Unlock()
	v, ok := r.visitors[ip]
	if !ok {
		lim := rate.NewLimiter(r.rate, r.burst)
		r.visitors[ip] = &visitor{limiter: lim, lastSeen: time.Now()}
		return lim
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func (r *rateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		r.mu.Lock()
		for ip, v := range r.visitors {
			if time.Since(v.lastSeen) > 5*time.Minute {
				delete(r.visitors, ip)
			}
		}
		r.mu.Unlock()
	}
}

type server struct {
	db  *pgxpool.Pool
	hub *sseHub
}

func NewRouter(db *pgxpool.Pool) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(loggingMiddleware())
	r.Use(corsMiddleware())

	rl := newRateLimiter()
	r.Use(func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.getLimiter(ip).Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			c.Abort()
			return
		}
		c.Next()
	})

	s := &server{db: db, hub: newSSEHub()}

	api := r.Group("/api")
	api.GET("/health", s.health)

	auth := api.Group("/auth")
	auth.POST("/register", s.register)
	auth.POST("/login", s.login)
	auth.GET("/me", s.jwtMiddleware(), s.me)

	protected := api.Group("")
	protected.Use(s.jwtMiddleware())
	protected.GET("/boards", s.listBoards)
	protected.POST("/boards", s.createBoard)
	protected.GET("/boards/:id", s.getBoard)
	protected.PUT("/boards/:id", s.updateBoard)
	protected.DELETE("/boards/:id", s.deleteBoard)
	protected.GET("/boards/:id/events", s.boardEvents)

	protected.PUT("/tasks/:id", s.updateTask)
	protected.DELETE("/tasks/:id", s.deleteTask)
	protected.POST("/columns/:colId/tasks", s.createTask)

	return r
}

func corsMiddleware() gin.HandlerFunc {
	allowedOrigin := os.Getenv("FRONTEND_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3000"
	}
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}
		c.Next()
	}
}

func loggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		slog.Info("http_request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"latency", time.Since(start).String(),
		)
	}
}

func (s *server) health(c *gin.Context) {
	if err := s.db.Ping(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *server) jwtMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		token := ""
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			token = c.Query("token")
		}
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			c.Abort()
			return
		}
		claims, err := ParseJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}

func (s *server) register(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	hash, err := HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	var userID string
	err = s.db.QueryRow(c.Request.Context(), `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id
	`, req.Email, hash).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email already exists"})
		return
	}

	token, err := GenerateJWT(userID, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"token": token})
}

func (s *server) login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var userID, hash string
	err := s.db.QueryRow(c.Request.Context(), `SELECT id, password_hash FROM users WHERE email = $1`, req.Email).Scan(&userID, &hash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}
	if err := VerifyPassword(hash, req.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	token, err := GenerateJWT(userID, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (s *server) me(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"user_id": c.GetString("userID"),
		"email":   c.GetString("email"),
	})
}

func (s *server) listBoards(c *gin.Context) {
	rows, err := s.db.Query(c.Request.Context(), `
		SELECT id, user_id, title, created_at, updated_at
		FROM boards
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list boards"})
		return
	}
	defer rows.Close()

	boards := []Board{}
	for rows.Next() {
		var b Board
		if err := rows.Scan(&b.ID, &b.UserID, &b.Title, &b.CreatedAt, &b.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse board"})
			return
		}
		boards = append(boards, b)
	}
	c.JSON(http.StatusOK, gin.H{"boards": boards})
}

func (s *server) createBoard(c *gin.Context) {
	var req struct {
		Title string `json:"title" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	tx, err := s.db.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start transaction"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var b Board
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO boards (user_id, title)
		VALUES ($1, $2)
		RETURNING id, user_id, title, created_at, updated_at
	`, c.GetString("userID"), req.Title).Scan(&b.ID, &b.UserID, &b.Title, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create board"})
		return
	}

	defaults := []string{"To Do", "In Progress", "Done"}
	b.Columns = make([]Column, 0, len(defaults))
	for i, title := range defaults {
		var col Column
		err := tx.QueryRow(c.Request.Context(), `
			INSERT INTO columns (board_id, title, position)
			VALUES ($1, $2, $3)
			RETURNING id, board_id, title, position, created_at
		`, b.ID, title, i).Scan(&col.ID, &col.BoardID, &col.Title, &col.Position, &col.CreatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create default columns"})
			return
		}
		b.Columns = append(b.Columns, col)
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
		return
	}

	s.publishBoardEvent(b.ID, "board.created")
	c.JSON(http.StatusCreated, b)
}

func (s *server) getBoard(c *gin.Context) {
	boardID := c.Param("id")
	board, err := s.getBoardData(c.Request.Context(), c.GetString("userID"), boardID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch board"})
		return
	}
	c.JSON(http.StatusOK, board)
}

func (s *server) updateBoard(c *gin.Context) {
	var req struct {
		Title string `json:"title" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	cmd, err := s.db.Exec(c.Request.Context(), `
		UPDATE boards
		SET title = $1, updated_at = now()
		WHERE id = $2 AND user_id = $3
	`, req.Title, c.Param("id"), c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update board"})
		return
	}
	if cmd.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}
	s.publishBoardEvent(c.Param("id"), "board.updated")
	c.Status(http.StatusNoContent)
}

func (s *server) deleteBoard(c *gin.Context) {
	cmd, err := s.db.Exec(c.Request.Context(), `
		DELETE FROM boards
		WHERE id = $1 AND user_id = $2
	`, c.Param("id"), c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete board"})
		return
	}
	if cmd.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *server) createTask(c *gin.Context) {
	var req struct {
		Title string `json:"title" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var boardID string
	err := s.db.QueryRow(c.Request.Context(), `
		SELECT b.id
		FROM boards b
		JOIN columns c ON c.board_id = b.id
		WHERE c.id = $1 AND b.user_id = $2
	`, c.Param("colId"), c.GetString("userID")).Scan(&boardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "column not found"})
		return
	}

	var task Task
	err = s.db.QueryRow(c.Request.Context(), `
		INSERT INTO tasks (column_id, title, position)
		VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM tasks WHERE column_id = $1), 0))
		RETURNING id, column_id, title, description, assignee, due_date, position, created_at, updated_at
	`, c.Param("colId"), req.Title).Scan(
		&task.ID,
		&task.ColumnID,
		&task.Title,
		&task.Description,
		&task.Assignee,
		&task.DueDate,
		&task.Position,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create task"})
		return
	}
	s.publishBoardEvent(boardID, "task.created")
	c.JSON(http.StatusCreated, task)
}

func (s *server) updateTask(c *gin.Context) {
	var req struct {
		Title       *string    `json:"title"`
		Description *string    `json:"description"`
		Assignee    *string    `json:"assignee"`
		ColumnID    *string    `json:"column_id"`
		DueDate     *time.Time `json:"due_date"`
		Position    *int       `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var current Task
	var boardID string
	err := s.db.QueryRow(c.Request.Context(), `
		SELECT t.id, t.column_id, t.title, t.description, t.assignee, t.due_date, t.position, t.created_at, t.updated_at, b.id
		FROM tasks t
		JOIN columns c ON c.id = t.column_id
		JOIN boards b ON b.id = c.board_id
		WHERE t.id = $1 AND b.user_id = $2
	`, c.Param("id"), c.GetString("userID")).Scan(
		&current.ID,
		&current.ColumnID,
		&current.Title,
		&current.Description,
		&current.Assignee,
		&current.DueDate,
		&current.Position,
		&current.CreatedAt,
		&current.UpdatedAt,
		&boardID,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	if req.Title != nil {
		current.Title = *req.Title
	}
	if req.Description != nil {
		current.Description = *req.Description
	}
	if req.Assignee != nil {
		current.Assignee = *req.Assignee
	}
	if req.ColumnID != nil {
		if err := s.validateColumnOwnership(c.Request.Context(), c.GetString("userID"), *req.ColumnID, boardID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid target column"})
			return
		}
		current.ColumnID = *req.ColumnID
	}
	if req.Position != nil {
		current.Position = *req.Position
	}
	if req.DueDate != nil {
		current.DueDate = req.DueDate
	}

	_, err = s.db.Exec(c.Request.Context(), `
		UPDATE tasks
		SET title = $1,
			description = $2,
			assignee = $3,
			column_id = $4,
			due_date = $5,
			position = $6,
			updated_at = now()
		WHERE id = $7
	`, current.Title, current.Description, current.Assignee, current.ColumnID, current.DueDate, current.Position, current.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update task"})
		return
	}
	s.publishBoardEvent(boardID, "task.updated")
	c.Status(http.StatusNoContent)
}

func (s *server) deleteTask(c *gin.Context) {
	var boardID string
	err := s.db.QueryRow(c.Request.Context(), `
		SELECT b.id
		FROM tasks t
		JOIN columns c ON c.id = t.column_id
		JOIN boards b ON b.id = c.board_id
		WHERE t.id = $1 AND b.user_id = $2
	`, c.Param("id"), c.GetString("userID")).Scan(&boardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	_, err = s.db.Exec(c.Request.Context(), `DELETE FROM tasks WHERE id = $1`, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete task"})
		return
	}
	s.publishBoardEvent(boardID, "task.deleted")
	c.Status(http.StatusNoContent)
}

func (s *server) boardEvents(c *gin.Context) {
	boardID := c.Param("id")
	if err := s.ensureBoardOwnership(c.Request.Context(), c.GetString("userID"), boardID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}

	stream := s.hub.subscribe(boardID)
	defer s.hub.unsubscribe(boardID, stream)

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case msg := <-stream:
			c.SSEvent("message", string(msg))
			return true
		case <-ticker.C:
			c.SSEvent("ping", "keep-alive")
			return true
		case <-c.Request.Context().Done():
			return false
		}
	})
}

func (s *server) publishBoardEvent(boardID, eventType string) {
	payload := []byte(fmt.Sprintf(`{"type":"%s","board_id":"%s"}`, eventType, boardID))
	s.hub.publish(boardID, payload)
}

func (s *server) ensureBoardOwnership(ctx context.Context, userID, boardID string) error {
	var exists bool
	err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM boards WHERE id = $1 AND user_id = $2)`, boardID, userID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return pgx.ErrNoRows
	}
	return nil
}

func (s *server) validateColumnOwnership(ctx context.Context, userID, columnID, boardID string) error {
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM columns c
			JOIN boards b ON b.id = c.board_id
			WHERE c.id = $1 AND b.user_id = $2 AND b.id = $3
		)
	`, columnID, userID, boardID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("column not found")
	}
	return nil
}

func (s *server) getBoardData(ctx context.Context, userID string, boardID string) (*Board, error) {
	var board Board
	err := s.db.QueryRow(ctx, `
		SELECT id, user_id, title, created_at, updated_at
		FROM boards
		WHERE id = $1 AND user_id = $2
	`, boardID, userID).Scan(&board.ID, &board.UserID, &board.Title, &board.CreatedAt, &board.UpdatedAt)
	if err != nil {
		return nil, err
	}

	colRows, err := s.db.Query(ctx, `
		SELECT id, board_id, title, position, created_at
		FROM columns
		WHERE board_id = $1
		ORDER BY position ASC, created_at ASC
	`, boardID)
	if err != nil {
		return nil, err
	}
	defer colRows.Close()

	columns := []Column{}
	columnByID := map[string]*Column{}
	for colRows.Next() {
		var col Column
		if err := colRows.Scan(&col.ID, &col.BoardID, &col.Title, &col.Position, &col.CreatedAt); err != nil {
			return nil, err
		}
		col.Tasks = []Task{}
		columns = append(columns, col)
		columnByID[col.ID] = &columns[len(columns)-1]
	}

	taskRows, err := s.db.Query(ctx, `
		SELECT id, column_id, title, description, assignee, due_date, position, created_at, updated_at
		FROM tasks
		WHERE column_id IN (SELECT id FROM columns WHERE board_id = $1)
		ORDER BY position ASC, created_at ASC
	`, boardID)
	if err != nil {
		return nil, err
	}
	defer taskRows.Close()

	for taskRows.Next() {
		var t Task
		if err := taskRows.Scan(&t.ID, &t.ColumnID, &t.Title, &t.Description, &t.Assignee, &t.DueDate, &t.Position, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		if col := columnByID[t.ColumnID]; col != nil {
			col.Tasks = append(col.Tasks, t)
		}
	}

	sort.Slice(columns, func(i, j int) bool {
		if columns[i].Position == columns[j].Position {
			return columns[i].CreatedAt.Before(columns[j].CreatedAt)
		}
		return columns[i].Position < columns[j].Position
	})

	board.Columns = columns
	return &board, nil
}
