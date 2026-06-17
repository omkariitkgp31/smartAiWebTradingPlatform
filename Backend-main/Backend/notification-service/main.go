package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/notification-service/config"
	"github.com/stockbroker/notification-service/database"
	"github.com/stockbroker/notification-service/handlers"
	"github.com/stockbroker/notification-service/models"
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
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "notification-service"})
	})

	r.POST("/notify", handlers.Notify)
	r.GET("/notifications/:user_id", handlers.GetNotifications)
	r.PUT("/notifications/read/:id", handlers.MarkRead)
	r.PUT("/notifications/read-all/:user_id", handlers.MarkAllRead)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
