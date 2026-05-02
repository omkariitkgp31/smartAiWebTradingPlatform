package utils

import (
	"errors"
	"fmt"
	"time"

	"open_soft_3/internal/models"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type Claims struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	TokenType string `json:"token_type"`
	jwt.RegisteredClaims
}

type TokenManager struct {
	secret     []byte
	issuer     string
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewTokenManager(secret, issuer string, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		secret:     []byte(secret),
		issuer:     issuer,
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
	}
}

func (m *TokenManager) GenerateAccessToken(user *models.User) (string, error) {
	return m.generateToken(user, TokenTypeAccess, m.accessTTL)
}

func (m *TokenManager) GenerateRefreshToken(user *models.User) (string, error) {
	return m.generateToken(user, TokenTypeRefresh, m.refreshTTL)
}

func (m *TokenManager) generateToken(user *models.User, tokenType string, ttl time.Duration) (string, error) {
	now := time.Now().UTC()
	claims := &Claims{
		UserID:    user.ID.String(),
		Email:     user.Email,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(m.secret)
	if err != nil {
		return "", fmt.Errorf("sign jwt: %w", err)
	}
	return signed, nil
}

func (m *TokenManager) ValidateToken(tokenString, expectedTokenType string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&Claims{},
		func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %s", token.Method.Alg())
			}
			return m.secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(m.issuer),
	)
	if err != nil {
		return nil, fmt.Errorf("parse jwt: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	if expectedTokenType != "" && claims.TokenType != expectedTokenType {
		return nil, fmt.Errorf("invalid token type")
	}

	return claims, nil
}
