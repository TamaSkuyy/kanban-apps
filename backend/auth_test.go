package main

import "testing"

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("password123")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	if err := VerifyPassword(hash, "password123"); err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}
}

func TestGenerateAndParseJWT(t *testing.T) {
	token, err := GenerateJWT("user-1", "user@example.com")
	if err != nil {
		t.Fatalf("GenerateJWT() error = %v", err)
	}
	claims, err := ParseJWT(token)
	if err != nil {
		t.Fatalf("ParseJWT() error = %v", err)
	}
	if claims.UserID != "user-1" {
		t.Fatalf("claims.UserID = %q, want %q", claims.UserID, "user-1")
	}
	if claims.Email != "user@example.com" {
		t.Fatalf("claims.Email = %q, want %q", claims.Email, "user@example.com")
	}
}

func TestGenerateOTP(t *testing.T) {
	code, err := GenerateOTP()
	if err != nil {
		t.Fatalf("GenerateOTP() error = %v", err)
	}
	if len(code) != 6 {
		t.Fatalf("code len = %d, want 6, got %q", len(code), code)
	}
	for _, ch := range code {
		if ch < '0' || ch > '9' {
			t.Fatalf("non-digit in OTP %q", code)
		}
	}
}

func TestHashToken(t *testing.T) {
	h1 := HashToken("hello")
	h2 := HashToken("hello")
	if h1 != h2 {
		t.Fatalf("hash not deterministic")
	}
	if h1 == HashToken("world") {
		t.Fatalf("different inputs should hash differently")
	}
	if len(h1) != 64 {
		t.Fatalf("sha256 hex len = %d, want 64", len(h1))
	}
}

func TestGenerateResetToken(t *testing.T) {
	tok, err := GenerateResetToken("user-1", "a@b.com")
	if err != nil {
		t.Fatalf("GenerateResetToken error = %v", err)
	}
	claims, err := ParseJWT(tok)
	if err != nil {
		t.Fatalf("ParseJWT reset token error = %v", err)
	}
	if claims.UserID != "user-1" {
		t.Fatalf("reset token user mismatch")
	}
}
