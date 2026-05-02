package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/market-service/config"
	"github.com/stockbroker/market-service/database"
	"github.com/stockbroker/market-service/handlers"
	"github.com/stockbroker/market-service/models"
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
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "market-service"})
	})

	r.POST("/trade-event", handlers.TradeEvent)
	r.POST("/publish", handlers.Publish)
	r.GET("/feed", handlers.GetFeed)
	r.GET("/summary", handlers.GetAllSummaries)
	r.GET("/summary/:symbol", handlers.GetSummary)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
