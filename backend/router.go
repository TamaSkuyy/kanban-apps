package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/time/rate"
)

type Board struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Title       string    `json:"title"`
	ThemeColor  *string   `json:"theme_color"`
	WorkspaceID *string   `json:"workspace_id"`
	ColumnCount int       `json:"column_count"`
	TaskCount   int       `json:"task_count"`
	Columns     []Column  `json:"columns,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
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
	Labels      []string   `json:"labels"`
	Position    int        `json:"position"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Activity struct {
	ID        string    `json:"id"`
	BoardID   string    `json:"board_id"`
	UserID    string    `json:"user_id"`
	Action    string    `json:"action"`
	Detail    string    `json:"detail"`
	CreatedAt time.Time `json:"created_at"`
}

type BoardMember struct {
	BoardID   string    `json:"board_id"`
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type sseClient struct {
	ch     chan []byte
	userID string
	email  string
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
	watchers map[string]map[chan []byte]*sseClient
}

func scanLabels(b []byte) []string {
	var labels []string
	if len(b) > 0 {
		json.Unmarshal(b, &labels)
	}
	if labels == nil {
		labels = []string{}
	}
	return labels
}

func newSSEHub() *sseHub {
	return &sseHub{watchers: map[string]map[chan []byte]*sseClient{}}
}

func (h *sseHub) subscribe(boardID, userID, email string) chan []byte {
	ch := make(chan []byte, 8)
	client := &sseClient{ch: ch, userID: userID, email: email}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.watchers[boardID] == nil {
		h.watchers[boardID] = map[chan []byte]*sseClient{}
	}
	h.watchers[boardID][ch] = client
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

func (h *sseHub) getOnlineUsers(boardID string) []map[string]string {
	h.mu.RLock()
	defer h.mu.RUnlock()
	users := []map[string]string{}
	seen := map[string]bool{}
	if h.watchers[boardID] == nil {
		return users
	}
	for _, client := range h.watchers[boardID] {
		if !seen[client.userID] {
			seen[client.userID] = true
			users = append(users, map[string]string{"user_id": client.userID, "email": client.email})
		}
	}
	return users
}

func (h *sseHub) publish(boardID string, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, client := range h.watchers[boardID] {
		select {
		case client.ch <- payload:
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
	auth.POST("/verify", s.verifyEmail)
	auth.POST("/otp/request", s.requestOTP)
	auth.POST("/otp/verify", s.verifyOTPLogin)
	auth.POST("/forgot", s.forgotPassword)
	auth.POST("/reset", s.resetPassword)
	auth.POST("/refresh", s.refreshToken)
	auth.GET("/me", s.jwtMiddleware(), s.me)

	api.POST("/webhooks/stripe", s.stripeWebhook)
	api.GET("/invites/:token", s.getInvite)

	protected := api.Group("")
	protected.Use(s.jwtMiddleware())
	protected.GET("/boards", s.listBoards)
	protected.POST("/boards", s.createBoard)
	protected.GET("/boards/:id", s.getBoard)
	protected.PUT("/boards/:id", s.updateBoard)
	protected.DELETE("/boards/:id", s.deleteBoard)
	protected.GET("/boards/:id/events", s.boardEvents)
		protected.GET("/boards/:id/activities", s.getActivities)
		protected.GET("/boards/:id/members", s.listMembers)
		protected.POST("/boards/:id/members", s.addMember)
		protected.PUT("/boards/:id/members/:userID", s.updateMemberRole)
		protected.DELETE("/boards/:id/members/:userID", s.removeMember)
		protected.GET("/boards/:id/online", s.getOnline)
		protected.POST("/boards/:id/cursor", s.updateCursor)

	protected.PUT("/tasks/:id", s.updateTask)
	protected.DELETE("/tasks/:id", s.deleteTask)
	protected.POST("/columns/:colId/tasks", s.createTask)
	protected.PUT("/columns/:id", s.updateColumn)

	protected.GET("/workspaces", s.listWorkspaces)
	protected.POST("/workspaces", s.createWorkspace)
	protected.GET("/workspaces/:id", s.getWorkspace)
	protected.PUT("/workspaces/:id", s.updateWorkspace)
	protected.DELETE("/workspaces/:id", s.deleteWorkspace)
	protected.GET("/workspaces/:id/boards", s.listBoardsByWorkspace)
	protected.GET("/workspaces/:id/members", s.listWorkspaceMembers)
	protected.POST("/workspaces/:id/members", s.addWorkspaceMember)
	protected.POST("/workspaces/:id/invites", s.createInvite)
	protected.GET("/workspaces/:id/invites", s.listInvites)
	protected.DELETE("/workspaces/:id/invites/:inviteId", s.revokeInvite)
	protected.GET("/me/invites", s.listMyInvites)
	protected.POST("/invites/by-id/:inviteId/accept", s.acceptInviteByID)
	protected.POST("/invites/:token/accept", s.acceptInvite)
	protected.POST("/invites/:token/decline", s.declineInvite)
	protected.POST("/billing/checkout", s.billingCheckout)
	protected.POST("/billing/portal", s.billingPortal)

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
		Name     string `json:"name"`
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
	// Try with name column (SaaS), fallback to old schema
	err = s.db.QueryRow(c.Request.Context(), `
		INSERT INTO users (name, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id
	`, req.Name, req.Email, hash).Scan(&userID)
	if err != nil {
		// fallback if name column missing
		err2 := s.db.QueryRow(c.Request.Context(), `
			INSERT INTO users (email, password_hash)
			VALUES ($1, $2)
			RETURNING id
		`, req.Email, hash).Scan(&userID)
		if err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email already exists"})
			return
		}
	}

	// SaaS: send verification OTP (best-effort, don't block)
	if _, err := s.createOTP(c, req.Email, "verify"); err != nil {
		// log but continue
	}

	token, err := GenerateJWT(userID, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"token": token, "requires_verification": true, "email": req.Email})
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
	var verifiedAt *string
	// Try with email_verified_at (SaaS), fallback if column missing
	err := s.db.QueryRow(c.Request.Context(), `SELECT id, password_hash, email_verified_at::text FROM users WHERE email = $1`, req.Email).Scan(&userID, &hash, &verifiedAt)
	if err != nil {
		// fallback old schema
		err = s.db.QueryRow(c.Request.Context(), `SELECT id, password_hash FROM users WHERE email = $1`, req.Email).Scan(&userID, &hash)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}
	} else {
		if verifiedAt == nil && os.Getenv("SKIP_VERIFY") != "1" {
			c.JSON(http.StatusForbidden, gin.H{"error": "email not verified", "code": "email_not_verified", "requires_verification": true})
			return
		}
	}
	if err := VerifyPassword(hash, req.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	_, _ = s.db.Exec(c.Request.Context(), `UPDATE users SET last_login_at = now() WHERE id = $1`, userID)

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
	workspaceID := c.Query("workspace_id")
	userID := c.GetString("userID")
	// backfill legacy boards without workspace into personal
	s.ensurePersonalWorkspace(c, userID, c.GetString("email"))
	if workspaceID != "" {
		var ok bool
		_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, workspaceID, userID).Scan(&ok)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "not a member of workspace"})
			return
		}
		rows, err := s.db.Query(c.Request.Context(), `SELECT b.id, b.user_id, b.title, b.theme_color, b.workspace_id, (SELECT COUNT(*) FROM columns c WHERE c.board_id=b.id), (SELECT COUNT(*) FROM tasks t JOIN columns c ON c.id=t.column_id WHERE c.board_id=b.id), b.created_at, b.updated_at FROM boards b WHERE b.workspace_id=$1 ORDER BY b.created_at DESC`, workspaceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list boards"})
			return
		}
		defer rows.Close()
		boards := []Board{}
		for rows.Next() {
			var b Board
			if err := rows.Scan(&b.ID, &b.UserID, &b.Title, &b.ThemeColor, &b.WorkspaceID, &b.ColumnCount, &b.TaskCount, &b.CreatedAt, &b.UpdatedAt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse board"})
				return
			}
			boards = append(boards, b)
		}
		c.JSON(http.StatusOK, gin.H{"boards": boards})
		return
	}
	rows, err := s.db.Query(c.Request.Context(), `
		SELECT DISTINCT b.id, b.user_id, b.title, b.theme_color, b.workspace_id, (SELECT COUNT(*) FROM columns c WHERE c.board_id=b.id), (SELECT COUNT(*) FROM tasks t JOIN columns c ON c.id=t.column_id WHERE c.board_id=b.id), b.created_at, b.updated_at
		FROM boards b
		LEFT JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = $1
		LEFT JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
		WHERE bm.user_id = $1 OR wm.user_id = $1 OR b.user_id = $1
		ORDER BY b.created_at DESC
	`, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list boards"})
		return
	}
	defer rows.Close()
	boards := []Board{}
	for rows.Next() {
		var b Board
		if err := rows.Scan(&b.ID, &b.UserID, &b.Title, &b.ThemeColor, &b.WorkspaceID, &b.ColumnCount, &b.TaskCount, &b.CreatedAt, &b.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse board"})
			return
		}
		boards = append(boards, b)
	}
	c.JSON(http.StatusOK, gin.H{"boards": boards})
}

func (s *server) createBoard(c *gin.Context) {
	var req struct {
		Title       string  `json:"title" binding:"required"`
		ThemeColor  *string `json:"theme_color"`
		WorkspaceID *string `json:"workspace_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	// Resolve workspace: body, query, or personal
	wsID := ""
	if req.WorkspaceID != nil && *req.WorkspaceID != "" {
		wsID = *req.WorkspaceID
	} else {
		wsID = c.Query("workspace_id")
		if wsID == "" {
			wsID = s.ensurePersonalWorkspace(c, c.GetString("userID"), c.GetString("email"))
		}
	}
	if wsID != "" {
		var ok bool
		_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, c.GetString("userID")).Scan(&ok)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "not a member of workspace"})
			return
		}
		if !s.checkEntitlements(c, wsID) {
			return
		}
	}

	tx, err := s.db.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start transaction"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var b Board
	// Try with workspace_id, fallback without
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO boards (user_id, title, theme_color, workspace_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, title, theme_color, created_at, updated_at
	`, c.GetString("userID"), req.Title, req.ThemeColor, wsID).Scan(&b.ID, &b.UserID, &b.Title, &b.ThemeColor, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		// fallback if workspace_id column missing
		err = tx.QueryRow(c.Request.Context(), `
			INSERT INTO boards (user_id, title, theme_color)
			VALUES ($1, $2, $3)
			RETURNING id, user_id, title, theme_color, created_at, updated_at
		`, c.GetString("userID"), req.Title, req.ThemeColor).Scan(&b.ID, &b.UserID, &b.Title, &b.ThemeColor, &b.CreatedAt, &b.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create board"})
			return
		}
	}
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

	// Add creator as owner
	_, err = tx.Exec(c.Request.Context(), `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`,
		b.ID, c.GetString("userID"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add board owner"})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
		return
	}

	s.publishBoardEvent(b.ID, "board.created", b)
	c.JSON(http.StatusCreated, b)
}

func (s *server) getBoard(c *gin.Context) {
	boardID := c.Param("id")
	userID := c.GetString("userID")
	board, err := s.getBoardData(c.Request.Context(), userID, boardID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch board"})
		return
	}

	role, _ := s.getMemberRole(c.Request.Context(), boardID, userID)
	c.JSON(http.StatusOK, gin.H{"board": board, "my_role": role})
}

func (s *server) updateBoard(c *gin.Context) {
	if err := s.requireBoardAccess(c.Request.Context(), c.Param("id"), c.GetString("userID"), "editor"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Title       string  `json:"title" binding:"required"`
		ThemeColor  *string `json:"theme_color"`
		WorkspaceID *string `json:"workspace_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	var cmd interface{ RowsAffected() int64 }
	var err error
	if req.WorkspaceID != nil && *req.WorkspaceID != "" {
		var ok bool
		_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, *req.WorkspaceID, c.GetString("userID")).Scan(&ok)
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "not a member of target workspace"})
			return
		}
		cmd, err = s.db.Exec(c.Request.Context(), `UPDATE boards SET title=$1, theme_color=$2, workspace_id=$3, updated_at=now() WHERE id=$4`, req.Title, req.ThemeColor, *req.WorkspaceID, c.Param("id"))
	} else {
		cmd, err = s.db.Exec(c.Request.Context(), `UPDATE boards SET title=$1, theme_color=$2, updated_at=now() WHERE id=$3`, req.Title, req.ThemeColor, c.Param("id"))
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update board"})
		return
	}
	if cmd.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}
	s.publishBoardEvent(c.Param("id"), "board.updated", nil)
	c.Status(http.StatusNoContent)
}

func (s *server) deleteBoard(c *gin.Context) {
	if err := s.requireBoardAccess(c.Request.Context(), c.Param("id"), c.GetString("userID"), "owner"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the owner can delete this board"})
		return
	}

	cmd, err := s.db.Exec(c.Request.Context(), `
		DELETE FROM boards
		WHERE id = $1
	`, c.Param("id"))
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
		JOIN board_members bm ON bm.board_id = b.id
		WHERE c.id = $1 AND bm.user_id = $2 AND bm.role IN ('owner', 'editor')
	`, c.Param("colId"), c.GetString("userID")).Scan(&boardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "column not found"})
		return
	}

	var task Task
	err = s.db.QueryRow(c.Request.Context(), `
		INSERT INTO tasks (column_id, title, position)
		VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM tasks WHERE column_id = $1), 0))
			RETURNING id, column_id, title, description, assignee, due_date, labels, position, created_at, updated_at
	`, c.Param("colId"), req.Title).Scan(
		&task.ID,
		&task.ColumnID,
		&task.Title,
		&task.Description,
		&task.Assignee,
			&task.DueDate,
			&task.Labels,
		&task.Position,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create task"})
		return
	}
	s.publishBoardEvent(boardID, "task.created", task)
		s.logActivity(c.Request.Context(), boardID, c.GetString("userID"), "task.created", task.Title)
	c.JSON(http.StatusCreated, task)
}

func (s *server) updateColumn(c *gin.Context) {
	var req struct {
		Position *int `json:"position" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var boardID string
	err := s.db.QueryRow(c.Request.Context(), `
		SELECT b.id
		FROM columns c
		JOIN boards b ON b.id = c.board_id
		JOIN board_members bm ON bm.board_id = b.id
		WHERE c.id = $1 AND bm.user_id = $2 AND bm.role IN ('owner', 'editor')
	`, c.Param("id"), c.GetString("userID")).Scan(&boardID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "column not found"})
		return
	}

	_, err = s.db.Exec(c.Request.Context(), `
		UPDATE columns
		SET position = $1
		WHERE id = $2
	`, *req.Position, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update column"})
		return
	}

	s.publishBoardEvent(boardID, "column.updated", map[string]interface{}{"column_id": c.Param("id"), "position": *req.Position})
	c.Status(http.StatusNoContent)
}

func (s *server) updateTask(c *gin.Context) {
	var req struct {
		Title       *string    `json:"title"`
		Description *string    `json:"description"`
		Assignee    *string    `json:"assignee"`
		ColumnID    *string    `json:"column_id"`
		DueDate     *time.Time `json:"due_date"`
		Labels      []string   `json:"labels"`
		Position    *int       `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var current Task
	var boardID string
	err := s.db.QueryRow(c.Request.Context(), `
			SELECT t.id, t.column_id, t.title, t.description, t.assignee, t.due_date, t.labels, t.position, t.created_at, t.updated_at, b.id
		FROM tasks t
		JOIN columns c ON c.id = t.column_id
		JOIN boards b ON b.id = c.board_id
		JOIN board_members bm ON bm.board_id = b.id
		WHERE t.id = $1 AND bm.user_id = $2 AND bm.role IN ('owner', 'editor')
	`, c.Param("id"), c.GetString("userID")).Scan(
		&current.ID,
		&current.ColumnID,
		&current.Title,
		&current.Description,
		&current.Assignee,
			&current.DueDate,
			&current.Labels,
		&current.Position,
		&current.CreatedAt,
		&current.UpdatedAt,
		&boardID,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

		originalColumnID := current.ColumnID

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

	labelsJSON, _ := json.Marshal(current.Labels)
	if labelsJSON == nil {
		labelsJSON = []byte("[]")
	}
	_, err = s.db.Exec(c.Request.Context(), `
		UPDATE tasks
		SET title = $1,
			description = $2,
			assignee = $3,
			column_id = $4,
			position = $5,
			labels = $6::jsonb,
			due_date = $7,
			updated_at = now()
		WHERE id = $8
		`, current.Title, current.Description, current.Assignee, current.ColumnID, current.Position, labelsJSON, current.DueDate, current.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update task"})
		return
	}
	if current.ColumnID != originalColumnID {
		s.publishBoardEvent(boardID, "task.moved", current)
		s.logActivity(c.Request.Context(), boardID, c.GetString("userID"), "task.moved", current.Title)
	} else {
		s.publishBoardEvent(boardID, "task.updated", current)
		s.logActivity(c.Request.Context(), boardID, c.GetString("userID"), "task.updated", current.Title)
	}
	c.Status(http.StatusNoContent)
}

func (s *server) deleteTask(c *gin.Context) {
	var boardID string
	err := s.db.QueryRow(c.Request.Context(), `
		SELECT b.id
		FROM tasks t
		JOIN columns c ON c.id = t.column_id
		JOIN boards b ON b.id = c.board_id
		JOIN board_members bm ON bm.board_id = b.id
		WHERE t.id = $1 AND bm.user_id = $2 AND bm.role IN ('owner', 'editor')
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
	s.publishBoardEvent(boardID, "task.deleted", map[string]string{"task_id": c.Param("id")})
	taskID := c.Param("id")
	s.logActivity(c.Request.Context(), boardID, c.GetString("userID"), "task.deleted", taskID)
	c.Status(http.StatusNoContent)
}

func (s *server) boardEvents(c *gin.Context) {
	boardID := c.Param("id")
	if err := s.ensureBoardOwnership(c.Request.Context(), c.GetString("userID"), boardID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}

	userID := c.GetString("userID")
	email := c.GetString("email")
	stream := s.hub.subscribe(boardID, userID, email)
	defer func() {
		s.hub.unsubscribe(boardID, stream)
		// Broadcast presence: user left
		online := s.hub.getOnlineUsers(boardID)
		presenceData, _ := json.Marshal(map[string]interface{}{"type": "presence.updated", "board_id": boardID, "data": online})
		s.hub.publish(boardID, presenceData)
	}()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	// Broadcast presence: user joined
	online := s.hub.getOnlineUsers(boardID)
	presenceData, _ := json.Marshal(map[string]interface{}{"type": "presence.updated", "board_id": boardID, "data": online})
	s.hub.publish(boardID, presenceData)

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

type boardEvent struct {
	Type    string      `json:"type"`
	BoardID string      `json:"board_id"`
	Data    interface{} `json:"data,omitempty"`
}


func (s *server) logActivity(ctx context.Context, boardID, userID, action, detail string) {
	_, _ = s.db.Exec(ctx, `
		INSERT INTO activities (board_id, user_id, action, detail)
		VALUES ($1, $2, $3, $4)
	`, boardID, userID, action, detail)
}

func (s *server) getActivities(c *gin.Context) {
	boardID := c.Param("id")
	if err := s.ensureBoardOwnership(c.Request.Context(), c.GetString("userID"), boardID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "board not found"})
		return
	}

	rows, err := s.db.Query(c.Request.Context(), `
		SELECT id, board_id, user_id, action, detail, created_at
		FROM activities
		WHERE board_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`, boardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch activities"})
		return
	}
	defer rows.Close()

	activities := []Activity{}
	for rows.Next() {
		var a Activity
		if err := rows.Scan(&a.ID, &a.BoardID, &a.UserID, &a.Action, &a.Detail, &a.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse activity"})
			return
		}
		activities = append(activities, a)
	}
	c.JSON(http.StatusOK, gin.H{"activities": activities})
}

// getMemberRole returns the role of a user on a board (empty string if not a member)
func (s *server) getMemberRole(ctx context.Context, boardID, userID string) (string, error) {
	var role string
	err := s.db.QueryRow(ctx, `SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2`,
		boardID, userID).Scan(&role)
	if err != nil {
		return "", err
	}
	return role, nil
}

// requireBoardAccess checks if user can access a board (any role)
func (s *server) requireBoardAccess(ctx context.Context, boardID, userID string, minRole string) error {
	role, err := s.getMemberRole(ctx, boardID, userID)
	if err != nil {
		return err
	}
	if minRole == "viewer" {
		return nil // any role is fine
	}
	if minRole == "editor" && (role == "owner" || role == "editor") {
		return nil
	}
	if minRole == "owner" && role == "owner" {
		return nil
	}
	return errors.New("insufficient permissions")
}

func (s *server) listMembers(c *gin.Context) {
	boardID := c.Param("id")
	if err := s.requireBoardAccess(c.Request.Context(), boardID, c.GetString("userID"), "viewer"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	rows, err := s.db.Query(c.Request.Context(), `
		SELECT bm.board_id, bm.user_id, u.email, bm.role, bm.created_at
		FROM board_members bm
		JOIN users u ON u.id = bm.user_id
		WHERE bm.board_id = $1
		ORDER BY bm.created_at ASC
	`, boardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list members"})
		return
	}
	defer rows.Close()

	members := []BoardMember{}
	for rows.Next() {
		var m BoardMember
		if err := rows.Scan(&m.BoardID, &m.UserID, &m.Email, &m.Role, &m.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse member"})
			return
		}
		members = append(members, m)
	}
	c.JSON(http.StatusOK, gin.H{"members": members})
}

func (s *server) addMember(c *gin.Context) {
	boardID := c.Param("id")
	if err := s.requireBoardAccess(c.Request.Context(), boardID, c.GetString("userID"), "owner"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the owner can add members"})
		return
	}

	var req struct {
		Email string `json:"email" binding:"required"`
		Role  string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || (req.Role != "editor" && req.Role != "viewer") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request — role must be editor or viewer"})
		return
	}

	// Find user by email
	var userID string
	err := s.db.QueryRow(c.Request.Context(), `SELECT id FROM users WHERE email = $1`, req.Email).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	_, err = s.db.Exec(c.Request.Context(), `
		INSERT INTO board_members (board_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (board_id, user_id) DO UPDATE SET role = $3
	`, boardID, userID, req.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add member"})
		return
	}

	c.Status(http.StatusNoContent)
}

func (s *server) updateMemberRole(c *gin.Context) {
	boardID := c.Param("id")
	targetUserID := c.Param("userID")
	if err := s.requireBoardAccess(c.Request.Context(), boardID, c.GetString("userID"), "owner"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the owner can change roles"})
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || (req.Role != "editor" && req.Role != "viewer") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role"})
		return
	}

	_, err := s.db.Exec(c.Request.Context(), `
		UPDATE board_members SET role = $1
		WHERE board_id = $2 AND user_id = $3 AND role != 'owner'
	`, req.Role, boardID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update role"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *server) removeMember(c *gin.Context) {
	boardID := c.Param("id")
	targetUserID := c.Param("userID")
	if err := s.requireBoardAccess(c.Request.Context(), boardID, c.GetString("userID"), "owner"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "only the owner can remove members"})
		return
	}

	// Cannot remove owner
	var role string
	err := s.db.QueryRow(c.Request.Context(), `SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2`,
		boardID, targetUserID).Scan(&role)
	if err != nil || role == "owner" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot remove the owner"})
		return
	}

	_, err = s.db.Exec(c.Request.Context(), `DELETE FROM board_members WHERE board_id = $1 AND user_id = $2`,
		boardID, targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove member"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *server) getOnline(c *gin.Context) {
	boardID := c.Param("id")
	if err := s.requireBoardAccess(c.Request.Context(), boardID, c.GetString("userID"), "viewer"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}
	online := s.hub.getOnlineUsers(boardID)
	c.JSON(http.StatusOK, gin.H{"online": online})
}

func (s *server) updateCursor(c *gin.Context) {
	boardID := c.Param("id")
	if err := s.requireBoardAccess(c.Request.Context(), boardID, c.GetString("userID"), "viewer"); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		X float64 `json:"x" binding:"required"`
		Y float64 `json:"y" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	cursorData := map[string]interface{}{
		"user_id": c.GetString("userID"),
		"email":   c.GetString("email"),
		"x":       req.X,
		"y":       req.Y,
	}
	evt := boardEvent{Type: "cursor.moved", BoardID: boardID, Data: cursorData}
	payload, _ := json.Marshal(evt)
	s.hub.publish(boardID, payload)

	c.Status(http.StatusNoContent)
}

func (s *server) publishBoardEvent(boardID, eventType string, data interface{}) {
	evt := boardEvent{Type: eventType, BoardID: boardID, Data: data}
	payload, _ := json.Marshal(evt)
	s.hub.publish(boardID, payload)
}

func (s *server) ensureBoardOwnership(ctx context.Context, userID, boardID string) error {
	var exists bool
	err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2)`, boardID, userID).Scan(&exists)
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
			SELECT b.id, b.user_id, b.title, b.theme_color, b.workspace_id, b.created_at, b.updated_at
		FROM boards b
		JOIN board_members bm ON bm.board_id = b.id
		WHERE b.id = $1 AND bm.user_id = $2
		`, boardID, userID).Scan(&board.ID, &board.UserID, &board.Title, &board.ThemeColor, &board.WorkspaceID, &board.CreatedAt, &board.UpdatedAt)
	if err != nil {
		// fallback if workspace_id column missing
		err = s.db.QueryRow(ctx, `
			SELECT b.id, b.user_id, b.title, b.theme_color, b.created_at, b.updated_at
		FROM boards b
		JOIN board_members bm ON bm.board_id = b.id
		WHERE b.id = $1 AND bm.user_id = $2
		`, boardID, userID).Scan(&board.ID, &board.UserID, &board.Title, &board.ThemeColor, &board.CreatedAt, &board.UpdatedAt)
	}
	if err != nil {
		return nil, err
	}
	if err != nil {
		return nil, err
	}

	// Single joined query: columns LEFT JOIN tasks
	rows, err := s.db.Query(ctx, `
		SELECT
			c.id, c.board_id, c.title, c.position, c.created_at,
			t.id, t.column_id, t.title, t.description, t.assignee,
				t.due_date, t.labels, t.position,
			t.created_at, t.updated_at
		FROM columns c
		LEFT JOIN tasks t ON t.column_id = c.id
		WHERE c.board_id = $1
		ORDER BY c.position ASC, c.created_at ASC, t.position ASC, t.created_at ASC
	`, boardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := []Column{}
	columnByID := map[string]*Column{}

	for rows.Next() {
		var colID, colBoardID, colTitle string
		var colPosition int
		var colCreatedAt time.Time
		var taskID, taskColumnID, taskTitle, taskDescription, taskAssignee *string
			var taskLabels []byte
		var taskDueDate *time.Time
		var taskPosition *int
		var taskCreatedAt, taskUpdatedAt *time.Time

		if err := rows.Scan(
			&colID, &colBoardID, &colTitle, &colPosition, &colCreatedAt,
			&taskID, &taskColumnID, &taskTitle, &taskDescription, &taskAssignee,
				&taskDueDate, &taskLabels, &taskPosition, &taskCreatedAt, &taskUpdatedAt,
		); err != nil {
			return nil, err
		}

		// Get or create column
		col, ok := columnByID[colID]
		if !ok {
			columns = append(columns, Column{
				ID:        colID,
				BoardID:   colBoardID,
				Title:     colTitle,
				Position:  colPosition,
				Tasks:     []Task{},
				CreatedAt: colCreatedAt,
			})
			col = &columns[len(columns)-1]
			columnByID[colID] = col
		}

		// If this row has a task, add it
		if taskID != nil {
			t := Task{
				ColumnID:    *taskColumnID,
				Title:       *taskTitle,
				Description: *taskDescription,
				Assignee:    *taskAssignee,
				DueDate:     taskDueDate,
				Labels:      scanLabels(taskLabels),
			}
			if taskID != nil {
				t.ID = *taskID
			}
			if taskPosition != nil {
				t.Position = *taskPosition
			}
			if taskCreatedAt != nil {
				t.CreatedAt = *taskCreatedAt
			}
			if taskUpdatedAt != nil {
				t.UpdatedAt = *taskUpdatedAt
			}
			col.Tasks = append(col.Tasks, t)
		}
	}

	board.Columns = columns
	return &board, nil
}
