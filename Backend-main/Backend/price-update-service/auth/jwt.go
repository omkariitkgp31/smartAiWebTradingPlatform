package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stockbroker/price-update-service/config"
)

var cfg *config.Config

func Init(c *config.Config) { cfg = c }

type Claims struct {
	jwt.RegisteredClaims
	Type string `json:"type"`
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization"})
			c.Abort()
			return
		}
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(strings.TrimPrefix(authHeader, "Bearer "), claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecretKey), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": errors.New("invalid token").Error()})
			c.Abort()
			return
		}
		c.Set("user_id", claims.Subject)
		c.Next()
	}
}
