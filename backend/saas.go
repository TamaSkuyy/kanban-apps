package main

import (
	"log/slog"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ---- OTP helpers stored in DB ----

func (s *server) createOTP(c *gin.Context, email, purpose string) (string, error) {
	// Rate limit: max 5 OTP per 15m, cooldown 60s per email+purpose
	var recentCount int
	_ = s.db.QueryRow(c.Request.Context(), `SELECT count(*) FROM otps WHERE email=$1 AND purpose=$2 AND created_at > now() - interval '15 minutes'`, strings.ToLower(email), purpose).Scan(&recentCount)
	if recentCount >= 5 {
		return "", &rateLimitedError{msg: "too many OTP requests, try again later"}
	}
	var lastAt *time.Time
	_ = s.db.QueryRow(c.Request.Context(), `SELECT created_at FROM otps WHERE email=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1`, strings.ToLower(email), purpose).Scan(&lastAt)
	if lastAt != nil && time.Since(*lastAt) < 60*time.Second {
		return "", &rateLimitedError{msg: "please wait 60s before next OTP"}
	}

	code, err := GenerateOTP()
	if err != nil {
		return "", err
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	expires := time.Now().Add(5 * time.Minute)
	_, err = s.db.Exec(c.Request.Context(), `
		INSERT INTO otps (email, code_hash, purpose, expires_at) VALUES ($1,$2,$3,$4)`,
		strings.ToLower(email), string(hash), purpose, expires)
	if err != nil {
		return "", err
	}
	// log mail
	mailer := NewMailer()
	_ = mailer.Send(email, "Kanban OTP", mailOTP(email, code))
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO email_logs (to_email, subject, purpose) VALUES ($1,$2,$3)`, email, "OTP "+purpose, purpose)
	return code, nil
}

type rateLimitedError struct{ msg string }

func (e *rateLimitedError) Error() string { return e.msg }

func (s *server) verifyOTP(c *gin.Context, email, code, purpose string) bool {
	var hash string
	var expires time.Time
	var attempts int
	var id string
	err := s.db.QueryRow(c.Request.Context(), `
		SELECT id, code_hash, expires_at, attempts FROM otps
		WHERE email=$1 AND purpose=$2 AND expires_at > now()
		ORDER BY created_at DESC LIMIT 1`, strings.ToLower(email), purpose).Scan(&id, &hash, &expires, &attempts)
	if err != nil {
		return false
	}
	if attempts >= 5 {
		return false
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(code)) != nil {
		_, _ = s.db.Exec(c.Request.Context(), `UPDATE otps SET attempts = attempts+1 WHERE id=$1`, id)
		return false
	}
	_, _ = s.db.Exec(c.Request.Context(), `DELETE FROM otps WHERE email=$1 AND purpose=$2`, strings.ToLower(email), purpose)
	return true
}

// ---- Auth SaaS handlers ----

func (s *server) verifyEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if !s.verifyOTP(c, req.Email, req.Code, "verify") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired code"})
		return
	}
	_, _ = s.db.Exec(c.Request.Context(), `UPDATE users SET email_verified_at = now() WHERE email=$1`, strings.ToLower(req.Email))
	c.JSON(http.StatusOK, gin.H{"verified": true})
}

func (s *server) requestOTP(c *gin.Context) {
	var req struct {
		Email   string `json:"email" binding:"required,email"`
		Purpose string `json:"purpose"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Purpose == "" {
		req.Purpose = "login"
	}
	if req.Purpose != "verify" && req.Purpose != "login" && req.Purpose != "reset" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid purpose"})
		return
	}
	if _, err := s.createOTP(c, req.Email, req.Purpose); err != nil {
		if _, ok := err.(*rateLimitedError); ok {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create OTP"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sent": true})
}

func (s *server) refreshToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	token := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}
	claims, err := ParseJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}
	newToken, err := GenerateJWT(claims.UserID, claims.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": newToken})
}

func (s *server) verifyOTPLogin(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if !s.verifyOTP(c, req.Email, req.Code, "login") {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid code"})
		return
	}
	var userID, email string
	err := s.db.QueryRow(c.Request.Context(), `SELECT id, email FROM users WHERE email=$1`, strings.ToLower(req.Email)).Scan(&userID, &email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	token, _ := GenerateJWT(userID, email)
	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (s *server) forgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	var userID string
	err := s.db.QueryRow(c.Request.Context(), `SELECT id FROM users WHERE email=$1`, strings.ToLower(req.Email)).Scan(&userID)
	if err != nil {
		// don't leak existence
		c.JSON(http.StatusOK, gin.H{"sent": true})
		return
	}
	token, _ := GenerateResetToken(userID, req.Email)
	hash := HashToken(token)
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2, now() + interval '15 minutes')`, userID, hash)
	link := os.Getenv("APP_URL")
	if link == "" {
		link = "http://localhost:3000"
	}
	link = link + "/reset?token=" + token
	_ = NewMailer().Send(req.Email, "Reset Password", mailResetLink(req.Email, link))
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO email_logs (to_email, subject, purpose) VALUES ($1,$2,$3)`, req.Email, "Reset password", "reset")
	c.JSON(http.StatusOK, gin.H{"sent": true})
}

func (s *server) resetPassword(c *gin.Context) {
	var req struct {
		Token       string `json:"token" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	claims, err := ParseJWT(req.Token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid token"})
		return
	}
	hash := HashToken(req.Token)
	var prID string
	var expires time.Time
	var used *time.Time
	err = s.db.QueryRow(c.Request.Context(), `SELECT id, expires_at, used_at FROM password_resets WHERE token_hash=$1`, hash).Scan(&prID, &expires, &used)
	if err != nil || used != nil || time.Now().After(expires) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expired or used token"})
		return
	}
	pwHash, _ := HashPassword(req.NewPassword)
	_, _ = s.db.Exec(c.Request.Context(), `UPDATE users SET password_hash=$1 WHERE id=$2`, pwHash, claims.UserID)
	_, _ = s.db.Exec(c.Request.Context(), `UPDATE password_resets SET used_at=now() WHERE id=$1`, prID)
	c.JSON(http.StatusOK, gin.H{"reset": true})
}

// ---- Workspaces ----

func (s *server) createWorkspace(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required"`
		Slug string `json:"slug"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	slug := req.Slug
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(req.Name, " ", "-")) + "-" + HashToken(req.Name)[:6]
	}
	userID := c.GetString("userID")
	var wsID string
	err := s.db.QueryRow(c.Request.Context(), `INSERT INTO workspaces (slug, name, owner_id) VALUES ($1,$2,$3) RETURNING id`, slug, req.Name, userID).Scan(&wsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create workspace"})
		return
	}
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,'owner')`, wsID, userID)
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO subscriptions (workspace_id, plan, status, trial_ends_at) VALUES ($1,'starter','trialing', now() + interval '14 days') ON CONFLICT (workspace_id) DO NOTHING`, wsID)
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO entitlements (workspace_id, max_boards, max_members) VALUES ($1,3,3) ON CONFLICT (workspace_id) DO NOTHING`, wsID)
	slog.Info("audit", "action", "workspace.created", "workspace_id", wsID, "user_id", userID)
	c.JSON(http.StatusCreated, gin.H{"id": wsID, "slug": slug, "name": req.Name})
}

func (s *server) listWorkspaces(c *gin.Context) {
	userID := c.GetString("userID")
	rows, _ := s.db.Query(c.Request.Context(), `SELECT w.id, w.slug, w.name FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id WHERE wm.user_id=$1 ORDER BY w.created_at DESC`, userID)
	defer func() {
		if rows != nil {
			rows.Close()
		}
	}()
	var out []gin.H
	if rows != nil {
		for rows.Next() {
			var id, slug, name string
			_ = rows.Scan(&id, &slug, &name)
			out = append(out, gin.H{"id": id, "slug": slug, "name": name})
		}
	}
	if out == nil {
		out = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"workspaces": out})
}

func (s *server) getWorkspace(c *gin.Context) {
	wsID := c.Param("id")
	userID := c.GetString("userID")
	var id, slug, name, ownerID string
	err := s.db.QueryRow(c.Request.Context(), `SELECT w.id, w.slug, w.name, w.owner_id FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id WHERE w.id=$1 AND wm.user_id=$2`, wsID, userID).Scan(&id, &slug, &name, &ownerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "workspace not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": id, "slug": slug, "name": name, "owner_id": ownerID})
}

func (s *server) updateWorkspace(c *gin.Context) {
	wsID := c.Param("id")
	userID := c.GetString("userID")
	// only owner/admin
	var role string
	_ = s.db.QueryRow(c.Request.Context(), `SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&role)
	if role != "owner" && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient role"})
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	_, _ = s.db.Exec(c.Request.Context(), `UPDATE workspaces SET name=$1, updated_at=now() WHERE id=$2`, req.Name, wsID)
	c.JSON(http.StatusOK, gin.H{"id": wsID, "name": req.Name})
}

func (s *server) deleteWorkspace(c *gin.Context) {
	wsID := c.Param("id")
	userID := c.GetString("userID")
	var role string
	_ = s.db.QueryRow(c.Request.Context(), `SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&role)
	if role != "owner" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only owner can delete"})
		return
	}
	_, _ = s.db.Exec(c.Request.Context(), `DELETE FROM workspaces WHERE id=$1`, wsID)
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

func (s *server) ensurePersonalWorkspace(c *gin.Context, userID string, email string) string {
	slug := "personal-" + HashToken(userID)[:8]
	var wsID string
	// try find personal by slug
	err := s.db.QueryRow(c.Request.Context(), `SELECT id FROM workspaces WHERE slug=$1`, slug).Scan(&wsID)
	if err != nil {
		name := "Personal"
		if email != "" {
			name = strings.Split(email, "@")[0] + "'s workspace"
		}
		err = s.db.QueryRow(c.Request.Context(), `INSERT INTO workspaces (slug, name, owner_id) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`, slug, name, userID).Scan(&wsID)
		if err != nil {
			_ = s.db.QueryRow(c.Request.Context(), `SELECT id FROM workspaces WHERE slug=$1`, slug).Scan(&wsID)
		}
	}
	if wsID != "" {
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`, wsID, userID)
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO subscriptions (workspace_id) VALUES ($1) ON CONFLICT DO NOTHING`, wsID)
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO entitlements (workspace_id) VALUES ($1) ON CONFLICT DO NOTHING`, wsID)
		// backfill boards without workspace (migrate legacy)
		_, _ = s.db.Exec(c.Request.Context(), `UPDATE boards SET workspace_id=$1 WHERE user_id=$2 AND workspace_id IS NULL`, wsID, userID)
	}
	return wsID
}

func (s *server) listWorkspaceMembers(c *gin.Context) {
	wsID := c.Param("id")
	userID := c.GetString("userID")
	var ok bool
	_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&ok)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
		return
	}
	rows, _ := s.db.Query(c.Request.Context(), `SELECT wm.user_id, u.email, wm.role FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=$1 ORDER BY wm.created_at`, wsID)
	defer func() { if rows != nil { rows.Close() } }()
	var members []gin.H
	if rows != nil {
		for rows.Next() {
			var uid, email, role string
			_ = rows.Scan(&uid, &email, &role)
			members = append(members, gin.H{"user_id": uid, "email": email, "role": role})
		}
	}
	if members == nil {
		members = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"members": members})
}

func (s *server) listBoardsByWorkspace(c *gin.Context) {
	wsID := c.Param("id")
	userID := c.GetString("userID")
	// check membership
	var exists bool
	_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
		return
	}
	rows, err := s.db.Query(c.Request.Context(), `SELECT b.id, b.user_id, b.title, b.theme_color, b.workspace_id, b.created_at, b.updated_at FROM boards b WHERE b.workspace_id=$1 ORDER BY b.created_at DESC`, wsID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list boards"})
		return
	}
	defer rows.Close()
	boards := []Board{}
	for rows.Next() {
		var b Board
		_ = rows.Scan(&b.ID, &b.UserID, &b.Title, &b.ThemeColor, &b.WorkspaceID, &b.CreatedAt, &b.UpdatedAt)
		boards = append(boards, b)
	}
	c.JSON(http.StatusOK, gin.H{"boards": boards})
}


func (s *server) addWorkspaceMember(c *gin.Context) {
    wsID := c.Param("id")
    userID := c.GetString("userID")
    var role string
    _ = s.db.QueryRow(c.Request.Context(), `SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&role)
    if role != "owner" && role != "admin" {
        c.JSON(403, gin.H{"error": "only owner/admin can invite"})
        return
    }
    var req struct {
        Email string `json:"email" binding:"required,email"`
        Role  string `json:"role"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    if req.Role == "" {
        req.Role = "member"
    }
    if req.Role != "member" && req.Role != "admin" && req.Role != "viewer" {
        req.Role = "member"
    }
    if !s.checkMemberEntitlements(c, wsID) {
        return
    }
    var targetID string
    err := s.db.QueryRow(c.Request.Context(), `SELECT id FROM users WHERE email=$1`, req.Email).Scan(&targetID)
    if err != nil {
        c.JSON(404, gin.H{"error": "user not found, must register first"})
        return
    }
    _, _ = s.db.Exec(c.Request.Context(), `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role=EXCLUDED.role`, wsID, targetID, req.Role)
    c.JSON(200, gin.H{"added": true})
}

// ---- Entitlements check ----

func (s *server) checkEntitlements(c *gin.Context, workspaceID string) bool {
	var maxBoards int
	err := s.db.QueryRow(c.Request.Context(), `SELECT max_boards FROM entitlements WHERE workspace_id=$1`, workspaceID).Scan(&maxBoards)
	if err != nil {
		return true // fail open if no entitlements yet
	}
	var count int
	_ = s.db.QueryRow(c.Request.Context(), `SELECT count(*) FROM boards WHERE workspace_id=$1`, workspaceID).Scan(&count)
	if count >= maxBoards {
		c.JSON(http.StatusForbidden, gin.H{"error": "board limit reached", "code": "limit_reached", "limit": maxBoards, "upgrade_url": "/#harga"})
		return false
	}
	return true
}

// ---- Invites ----

func generateInviteToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *server) createInvite(c *gin.Context) {
	wsID := c.Param("id")
	userID := c.GetString("userID")
	var role string
	_ = s.db.QueryRow(c.Request.Context(), `SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&role)
	if role != "owner" && role != "admin" {
		c.JSON(403, gin.H{"error": "only owner/admin can invite"})
		return
	}
	var req struct {
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	if req.Role == "" {
		req.Role = "member"
	}
	if req.Role != "member" && req.Role != "admin" && req.Role != "viewer" {
		req.Role = "member"
	}
	if !s.checkMemberEntitlements(c, wsID) {
        return
    }
	token, _ := generateInviteToken()
	hash := HashToken(token)
	expires := time.Now().Add(7 * 24 * time.Hour)
	_, err := s.db.Exec(c.Request.Context(), `INSERT INTO invites (workspace_id, email, role, token_hash, expires_at) VALUES ($1,$2,$3,$4,$5)`, wsID, req.Email, req.Role, hash, expires)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create invite"})
		return
	}
	var wsName string
	_ = s.db.QueryRow(c.Request.Context(), `SELECT name FROM workspaces WHERE id=$1`, wsID).Scan(&wsName)
	link := os.Getenv("APP_URL")
	if link == "" {
		link = "http://localhost:3000"
	}
	link = link + "/invite/" + token
	_ = NewMailer().Send(req.Email, "Undangan workspace "+wsName, mailInvite(wsName, link))
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO email_logs (to_email, subject, purpose) VALUES ($1,$2,$3)`, req.Email, "Invite "+wsName, "invite")
	slog.Info("audit", "action", "invite.sent", "workspace_id", wsID, "email", req.Email, "role", req.Role)
	c.JSON(201, gin.H{"token": token, "link": link})
}

func (s *server) listInvites(c *gin.Context) {
	wsID := c.Param("id")
	userID := c.GetString("userID")
	var ok bool
	_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&ok)
	if !ok {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}
	rows, _ := s.db.Query(c.Request.Context(), `SELECT id, email, role, status, expires_at, created_at FROM invites WHERE workspace_id=$1 ORDER BY created_at DESC`, wsID)
	defer func() { if rows != nil { rows.Close() } }()
	var out []gin.H
	if rows != nil {
		for rows.Next() {
			var id, email, role, status string
			var expires, created time.Time
			_ = rows.Scan(&id, &email, &role, &status, &expires, &created)
			out = append(out, gin.H{"id": id, "email": email, "role": role, "status": status, "expires_at": expires, "created_at": created})
		}
	}
	if out == nil {
		out = []gin.H{}
	}
	c.JSON(200, gin.H{"invites": out})
}

func (s *server) revokeInvite(c *gin.Context) {
	wsID := c.Param("id")
	inviteID := c.Param("inviteId")
	userID := c.GetString("userID")
	var role string
	_ = s.db.QueryRow(c.Request.Context(), `SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&role)
	if role != "owner" && role != "admin" {
		c.JSON(403, gin.H{"error": "only owner/admin"})
		return
	}
	_, _ = s.db.Exec(c.Request.Context(), `UPDATE invites SET status='revoked' WHERE id=$1 AND workspace_id=$2`, inviteID, wsID)
	c.JSON(200, gin.H{"revoked": true})
}

func (s *server) getInvite(c *gin.Context) {
	token := c.Param("token")
	hash := HashToken(token)
	var id, wsID, email, role, status string
	var wsName string
	var expires time.Time
	err := s.db.QueryRow(c.Request.Context(), `SELECT i.id, i.workspace_id, i.email, i.role, i.status, i.expires_at, w.name FROM invites i JOIN workspaces w ON w.id=i.workspace_id WHERE i.token_hash=$1`, hash).Scan(&id, &wsID, &email, &role, &status, &expires, &wsName)
	if err != nil {
		c.JSON(404, gin.H{"error": "invite not found"})
		return
	}
	if status != "pending" || time.Now().After(expires) {
		c.JSON(410, gin.H{"error": "invite expired or used"})
		return
	}
	c.JSON(200, gin.H{"id": id, "workspace_id": wsID, "workspace_name": wsName, "email": email, "role": role, "expires_at": expires})
}

func (s *server) acceptInvite(c *gin.Context) {
	token := c.Param("token")
	hash := HashToken(token)
	userID := c.GetString("userID")
	var inviteID, wsID, role, status string
	var expires time.Time
	err := s.db.QueryRow(c.Request.Context(), `SELECT id, workspace_id, role, status, expires_at FROM invites WHERE token_hash=$1`, hash).Scan(&inviteID, &wsID, &role, &status, &expires)
	if err != nil {
		c.JSON(404, gin.H{"error": "invite not found"})
		return
	}
	if status != "pending" || time.Now().After(expires) {
		c.JSON(410, gin.H{"error": "invite expired"})
		return
	}
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role=EXCLUDED.role`, wsID, userID, role)
	_, _ = s.db.Exec(c.Request.Context(), `UPDATE invites SET status='accepted' WHERE id=$1`, inviteID)
	slog.Info("audit", "action", "invite.accepted", "workspace_id", wsID, "user_id", userID)
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO subscriptions (workspace_id) VALUES ($1) ON CONFLICT DO NOTHING`, wsID)
	_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO entitlements (workspace_id) VALUES ($1) ON CONFLICT DO NOTHING`, wsID)
	c.JSON(200, gin.H{"accepted": true, "workspace_id": wsID})
}

func (s *server) declineInvite(c *gin.Context) {
	token := c.Param("token")
	hash := HashToken(token)
	_, _ = s.db.Exec(c.Request.Context(), `UPDATE invites SET status='revoked' WHERE token_hash=$1`, hash)
	c.JSON(200, gin.H{"declined": true})
}


func (s *server) listMyInvites(c *gin.Context) {
    email := c.GetString("email")
    rows, _ := s.db.Query(c.Request.Context(), `SELECT i.id, i.workspace_id, w.name, i.role, i.expires_at FROM invites i JOIN workspaces w ON w.id=i.workspace_id WHERE i.email=$1 AND i.status='pending' AND i.expires_at > now() ORDER BY i.created_at DESC`, email)
    defer func() { if rows != nil { rows.Close() } }()
    var out []gin.H
    if rows != nil {
        for rows.Next() {
            var id, wsID, wsName, role string
            var expires time.Time
            _ = rows.Scan(&id, &wsID, &wsName, &role, &expires)
            out = append(out, gin.H{"id": id, "workspace_id": wsID, "workspace_name": wsName, "role": role, "expires_at": expires})
        }
    }
    if out == nil { out = []gin.H{} }
    c.JSON(200, gin.H{"invites": out})
}


func (s *server) acceptInviteByID(c *gin.Context) {
    inviteID := c.Param("inviteId")
    userID := c.GetString("userID")
    email := c.GetString("email")
    var wsID, role, status, inviteEmail string
    var expires time.Time
    err := s.db.QueryRow(c.Request.Context(), `SELECT workspace_id, role, status, email, expires_at FROM invites WHERE id=$1`, inviteID).Scan(&wsID, &role, &status, &inviteEmail, &expires)
    if err != nil {
        c.JSON(404, gin.H{"error": "invite not found"})
        return
    }
    if status != "pending" || time.Now().After(expires) {
        c.JSON(410, gin.H{"error": "invite expired"})
        return
    }
    if inviteEmail != email {
        // allow if email matches case-insensitive
        if email == "" || inviteEmail != email {
            c.JSON(403, gin.H{"error": "invite email mismatch"})
            return
        }
    }
    _, _ = s.db.Exec(c.Request.Context(), `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role=EXCLUDED.role`, wsID, userID, role)
    _, _ = s.db.Exec(c.Request.Context(), `UPDATE invites SET status='accepted' WHERE id=$1`, inviteID)
    c.JSON(200, gin.H{"accepted": true, "workspace_id": wsID})
}


// ---- GDPR ----

func (s *server) deleteMe(c *gin.Context) {
    userID := c.GetString("userID")
    anon := "deleted_" + userID[:8] + "@deleted.local"
    _, _ = s.db.Exec(c.Request.Context(), `UPDATE users SET email=$1, name='Deleted User', password_hash='deleted', email_verified_at=NULL WHERE id=$2`, anon, userID)
    c.JSON(200, gin.H{"deleted": true, "anon_email": anon})
}

func (s *server) exportMe(c *gin.Context) {
    userID := c.GetString("userID")
    var email, name string
    _ = s.db.QueryRow(c.Request.Context(), `SELECT email, COALESCE(name,'') FROM users WHERE id=$1`, userID).Scan(&email, &name)
    rows, _ := s.db.Query(c.Request.Context(), `SELECT w.id, w.name, w.slug FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id WHERE wm.user_id=$1`, userID)
    var workspaces []gin.H
    if rows != nil {
        defer rows.Close()
        for rows.Next() {
            var id, n, slug string
            _ = rows.Scan(&id, &n, &slug)
            workspaces = append(workspaces, gin.H{"id": id, "name": n, "slug": slug})
        }
    }
    rows2, _ := s.db.Query(c.Request.Context(), `SELECT b.id, b.title, b.workspace_id FROM boards b WHERE b.user_id=$1`, userID)
    var boards []gin.H
    if rows2 != nil {
        defer rows2.Close()
        for rows2.Next() {
            var id, title string
            var ws *string
            _ = rows2.Scan(&id, &title, &ws)
            boards = append(boards, gin.H{"id": id, "title": title, "workspace_id": ws})
        }
    }
    if workspaces == nil { workspaces = []gin.H{} }
    if boards == nil { boards = []gin.H{} }
    c.JSON(200, gin.H{"user": gin.H{"id": userID, "email": email, "name": name}, "workspaces": workspaces, "boards": boards})
}


// ---- Billing ----

func entitlementsForPlan(plan string) (maxBoards, maxMembers int, features string) {
	switch plan {
	case "pro":
		return 100, 50, `{"timeline":true,"workload":true}`
	case "scale":
		return 1000, 1000, `{"timeline":true,"workload":true,"sso":true}`
	default:
		return 3, 3, `{}`
	}
}

func (s *server) billingCheckout(c *gin.Context) {
	var req struct {
		WorkspaceID string `json:"workspace_id" binding:"required"`
		Plan        string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid request"})
		return
	}
	userID := c.GetString("userID")
	var ok bool
	_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role IN ('owner','admin')`, req.WorkspaceID, userID).Scan(&ok)
	if !ok {
		c.JSON(403, gin.H{"error": "only owner/admin can checkout"})
		return
	}
	if os.Getenv("STRIPE_SECRET") == "" {
		// dev stub: langsung upgrade entitlements
		maxB, maxM, feat := entitlementsForPlan(req.Plan)
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO subscriptions (workspace_id, plan, status) VALUES ($1,$2,'active') ON CONFLICT (workspace_id) DO UPDATE SET plan=$2, status='active', updated_at=now()`, req.WorkspaceID, req.Plan)
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO entitlements (workspace_id, max_boards, max_members, features) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (workspace_id) DO UPDATE SET max_boards=$2, max_members=$3, features=$4::jsonb`, req.WorkspaceID, maxB, maxM, feat)
		c.JSON(200, gin.H{"url": "/workspaces/" + req.WorkspaceID + "?upgraded=" + req.Plan, "stub": true, "plan": req.Plan})
		return
	}
	c.JSON(200, gin.H{"url": "https://checkout.stripe.com/stub", "stub": true, "plan": req.Plan})
}

func (s *server) billingPortal(c *gin.Context) {
	var req struct {
		WorkspaceID string `json:"workspace_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// also allow query param
		req.WorkspaceID = c.Query("workspace_id")
		if req.WorkspaceID == "" {
			c.JSON(400, gin.H{"error": "workspace_id required"})
			return
		}
	}
	c.JSON(200, gin.H{"url": "https://billing.stripe.com/p/session/stub", "stub": true})
}

func (s *server) billingSubscription(c *gin.Context) {
	wsID := c.Query("workspace_id")
	if wsID == "" {
		c.JSON(400, gin.H{"error": "workspace_id required"})
		return
	}
	userID := c.GetString("userID")
	var ok bool
	_ = s.db.QueryRow(c.Request.Context(), `SELECT true FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`, wsID, userID).Scan(&ok)
	if !ok {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}
	var plan, status string
	var trialEnds *time.Time
	var maxB, maxM int
	var features []byte
	_ = s.db.QueryRow(c.Request.Context(), `SELECT plan, status, trial_ends_at FROM subscriptions WHERE workspace_id=$1`, wsID).Scan(&plan, &status, &trialEnds)
	_ = s.db.QueryRow(c.Request.Context(), `SELECT max_boards, max_members, features FROM entitlements WHERE workspace_id=$1`, wsID).Scan(&maxB, &maxM, &features)
	if plan == "" {
		plan = "starter"
		status = "trialing"
	}
	if maxB == 0 {
		maxB, maxM = 3, 3
	}
	c.JSON(200, gin.H{"plan": plan, "status": status, "trial_ends_at": trialEnds, "entitlements": gin.H{"max_boards": maxB, "max_members": maxM, "features": string(features)}})
}

func (s *server) stripeWebhook(c *gin.Context) {
	var req struct {
		EventID string `json:"event_id"`
		Plan    string `json:"plan"`
		WorkspaceID string `json:"workspace_id"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.EventID != "" {
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO stripe_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, req.EventID)
	}
	// dev helper: if workspace_id + plan provided, apply entitlements
	if req.WorkspaceID != "" && req.Plan != "" {
		maxB, maxM, feat := entitlementsForPlan(req.Plan)
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO subscriptions (workspace_id, plan, status) VALUES ($1,$2,'active') ON CONFLICT (workspace_id) DO UPDATE SET plan=$2, status='active'`, req.WorkspaceID, req.Plan)
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO entitlements (workspace_id, max_boards, max_members, features) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (workspace_id) DO UPDATE SET max_boards=$2, max_members=$3, features=$4::jsonb`, req.WorkspaceID, maxB, maxM, feat)
	}
	c.JSON(http.StatusOK, gin.H{"received": true})
}

func (s *server) checkMemberEntitlements(c *gin.Context, workspaceID string) bool {
	var maxM int
	err := s.db.QueryRow(c.Request.Context(), `SELECT max_members FROM entitlements WHERE workspace_id=$1`, workspaceID).Scan(&maxM)
	if err != nil {
		return true
	}
	var count int
	_ = s.db.QueryRow(c.Request.Context(), `SELECT count(*) FROM workspace_members WHERE workspace_id=$1`, workspaceID).Scan(&count)
	if count >= maxM {
		c.JSON(http.StatusForbidden, gin.H{"error": "member limit reached", "code": "member_limit", "limit": maxM, "upgrade_url": "/workspaces/" + workspaceID})
		return false
	}
	return true
}
