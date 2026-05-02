package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/order-matcher/config"
	"github.com/stockbroker/order-matcher/database"
	"github.com/stockbroker/order-matcher/handlers"
	"github.com/stockbroker/order-matcher/models"
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
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "order-matcher"})
	})

	r.POST("/match", handlers.Match)
	r.GET("/book/:symbol", handlers.GetBook)
	r.GET("/matches", handlers.GetMatches)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
