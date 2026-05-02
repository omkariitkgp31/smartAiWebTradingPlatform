package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"open_soft_3/internal/utils"

	"github.com/gin-gonic/gin"
)

func RequestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		logger.Info(
			"http_request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"ip", c.ClientIP(),
			"user_agent", c.Request.UserAgent(),
		)
	}
}

func Recovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				logger.Error(
					"panic_recovered",
					"panic", rec,
					"path", c.Request.URL.Path,
					"method", c.Request.Method,
					"stack", string(debug.Stack()),
				)
				utils.WriteError(c, http.StatusInternalServerError, "internal_error", "Internal server error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
