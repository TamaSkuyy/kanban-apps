package main

import (
	"log/slog"
	"os"
)

// Mailer abstraction — Fase 0 SaaS
type Mailer interface {
	Send(to, subject, html string) error
}

type logMailer struct{}

func (m *logMailer) Send(to, subject, html string) error {
	slog.Info("mail.sent", "to", to, "subject", subject)
	if os.Getenv("LOG_MAIL_BODY") == "1" {
		slog.Info("mail.body", "html", html)
	}
	return nil
}

// NewMailer picks real provider later (Resend/SES). For now log.
func NewMailer() Mailer {
	// TODO: if RESEND_API_KEY set, return resendMailer
	return &logMailer{}
}

func mailOTP(to, code string) string {
	return "<p>Kode OTP Kanban Workspace: <b>" + code + "</b> — berlaku 5 menit. Jangan bagikan.</p>"
}

func mailResetLink(to, link string) string {
	return "<p>Klik link untuk reset password (15 menit): <a href=\"" + link + "\">" + link + "</a></p>"
}

func mailInvite(workspaceName, link string) string {
	return "<p>Kamu diundang ke workspace <b>" + workspaceName + "</b>. Terima undangan: <a href=\"" + link + "\">" + link + "</a></p>"
}
