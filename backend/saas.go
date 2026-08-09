package main

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ---- OTP helpers stored in DB ----

func (s *server) createOTP(c *gin.Context, email, purpose string) (string, error) {
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create OTP"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sent": true})
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

// ---- Billing stubs ----

func (s *server) billingCheckout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"url": "https://checkout.stripe.com/stub", "stub": true})
}

func (s *server) billingPortal(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"url": "https://billing.stripe.com/stub", "stub": true})
}

func (s *server) stripeWebhook(c *gin.Context) {
	var req struct {
		EventID string `json:"event_id"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.EventID != "" {
		_, _ = s.db.Exec(c.Request.Context(), `INSERT INTO stripe_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, req.EventID)
	}
	c.JSON(http.StatusOK, gin.H{"received": true})
}
