package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/order-service/auth"
	"github.com/stockbroker/order-service/config"
	"github.com/stockbroker/order-service/database"
	"github.com/stockbroker/order-service/dispatcher"
	"github.com/stockbroker/order-service/handlers"
	"github.com/stockbroker/order-service/models"
)

func main() {
	cfg := config.Load()
	auth.Init(cfg)
	dispatcher.Init(cfg)
	database.Connect(cfg)
	models.AutoMigrate(database.DB)

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": cfg.AppName, "version": "1.0.0"})
	})
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "order-service"})
	})

	protected := r.Group("/")
	protected.Use(auth.AuthMiddleware())
	protected.POST("/buy", handlers.PlaceBuyOrder)
	protected.POST("/sell", handlers.PlaceSellOrder)
	protected.GET("/orders", handlers.ListOrders)
	protected.GET("/orders/:id", handlers.GetOrder)
	protected.DELETE("/orders/:id", handlers.CancelOrder)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
