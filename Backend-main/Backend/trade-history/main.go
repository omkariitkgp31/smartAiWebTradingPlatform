package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/trade-history/config"
	"github.com/stockbroker/trade-history/database"
	"github.com/stockbroker/trade-history/handlers"
	"github.com/stockbroker/trade-history/models"
)

func main() {
	cfg := config.Load()
	database.Connect(cfg)
	models.AutoMigrate(database.DB)

	r := gin.Default()
	r.Use(cors.Default())

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"service": cfg.AppName, "version": "1.0.0"})
	})
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "trade-history"})
	})

	r.POST("/record", handlers.Record)
	r.GET("/history", handlers.GetHistory)
	r.GET("/history/:symbol", handlers.GetBySymbol)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
