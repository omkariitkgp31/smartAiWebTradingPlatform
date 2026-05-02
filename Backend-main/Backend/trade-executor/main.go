package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/trade-executor/config"
	"github.com/stockbroker/trade-executor/database"
	"github.com/stockbroker/trade-executor/handlers"
	"github.com/stockbroker/trade-executor/models"
)

func main() {
	cfg := config.Load()
	handlers.Init(cfg)
	database.Connect(cfg)
	models.AutoMigrate(database.DB)

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": cfg.AppName, "version": "1.0.0"})
	})
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "trade-executor"})
	})

	r.POST("/execute", handlers.Execute)
	r.GET("/trades", handlers.ListTrades)
	r.GET("/trades/:id", handlers.GetTrade)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
