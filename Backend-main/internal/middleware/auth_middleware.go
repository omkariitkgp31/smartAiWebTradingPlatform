package middleware

import (
	"net/http"
	"strings"

	"open_soft_3/internal/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(tokens *utils.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" {
			utils.WriteError(c, http.StatusUnauthorized, "missing_token", "Authorization header is required")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			utils.WriteError(c, http.StatusUnauthorized, "invalid_auth_header", "Authorization header format must be Bearer <token>")
			c.Abort()
			return
		}

		claims, err := tokens.ValidateToken(parts[1], utils.TokenTypeAccess)
		if err != nil {
			utils.WriteError(c, http.StatusUnauthorized, "invalid_token", "Token is invalid or expired")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
}
