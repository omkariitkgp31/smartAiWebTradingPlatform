package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/portfolio-service/auth"
	"github.com/stockbroker/portfolio-service/config"
	"github.com/stockbroker/portfolio-service/database"
	"github.com/stockbroker/portfolio-service/handlers"
	"github.com/stockbroker/portfolio-service/models"
)

func main() {
	cfg := config.Load()
	auth.Init(cfg)
	database.Connect(cfg)
	models.AutoMigrate(database.DB)

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": cfg.AppName, "version": "1.0.0"})
	})
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "portfolio-service"})
	})

	// Internal endpoint (from Queue Processor)
	r.POST("/update", handlers.UpdatePortfolio)

	// Protected endpoints
	protected := r.Group("/")
	protected.Use(auth.AuthMiddleware())
	protected.GET("/portfolio", handlers.GetPortfolio)
	protected.GET("/holdings/:symbol", handlers.GetHolding)
	protected.GET("/transactions", handlers.GetTransactions)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
