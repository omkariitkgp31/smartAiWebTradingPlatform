package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/identity-service/auth"
	"github.com/stockbroker/identity-service/config"
	"github.com/stockbroker/identity-service/database"
	"github.com/stockbroker/identity-service/handlers"
	"github.com/stockbroker/identity-service/models"
)

func main() {
	cfg := config.Load()
	auth.Init(cfg)
	database.Connect(cfg)
	models.AutoMigrate(database.DB)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		AllowCredentials: true,
	}))

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": cfg.AppName, "version": "1.0.0"})
	})
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "identity-service"})
	})

	// Public routes
	r.POST("/register", handlers.Register)
	r.POST("/login", handlers.Login)
	r.POST("/refresh", handlers.Refresh)

	// Protected routes
	protected := r.Group("/")
	protected.Use(auth.AuthMiddleware())
	protected.GET("/me", handlers.GetProfile)
	protected.PUT("/me", handlers.UpdateProfile)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
