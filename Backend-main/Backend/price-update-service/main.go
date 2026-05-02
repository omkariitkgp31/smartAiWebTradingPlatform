package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/price-update-service/auth"
	"github.com/stockbroker/price-update-service/config"
	"github.com/stockbroker/price-update-service/database"
	"github.com/stockbroker/price-update-service/handlers"
	"github.com/stockbroker/price-update-service/models"
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
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "price-update-service"})
	})

	// Public
	r.GET("/companies", handlers.GetCompanies)
	r.GET("/companies/:symbol", handlers.GetCompanyData)
	r.PUT("/price", handlers.UpdatePrice)
	r.POST("/cdc", handlers.PriceChangeCDC)
	r.GET("/history/:symbol", handlers.GetPriceHistory)

	// Protected
	protected := r.Group("/")
	protected.Use(auth.AuthMiddleware())
	protected.POST("/companies", handlers.AddCompany)

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
