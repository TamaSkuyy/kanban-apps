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
