package router

import (
	"log/slog"
	"net/http"
	"time"

	"open_soft_3/config"
	"open_soft_3/internal/handlers"
	"open_soft_3/internal/middleware"
	"open_soft_3/internal/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func New(cfg *config.Config, authHandler *handlers.AuthHandler, tokenManager *utils.TokenManager, logger *slog.Logger) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.CORS())
	r.Use(middleware.RequestLogger(logger))
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.SecurityHeaders())

	globalLimiter := middleware.NewIPRateLimiter(
		rate.Limit(cfg.GlobalRateLimitRPS),
		cfg.GlobalRateLimitBurst,
		10*time.Minute,
	)
	r.Use(globalLimiter.Middleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	identity := r.Group("/api/identity")
	identity.POST("/register", authHandler.Register)
	identity.POST("/verify-otp", authHandler.VerifyOTP)
	identity.POST("/login", authHandler.Login)
	identity.POST("/resend-otp", authHandler.ResendOTP)
	identity.POST("/refresh", authHandler.Refresh)

	protected := identity.Group("/")
	protected.Use(middleware.AuthMiddleware(tokenManager))
	protected.GET("/me", authHandler.Me)

	return r
}
