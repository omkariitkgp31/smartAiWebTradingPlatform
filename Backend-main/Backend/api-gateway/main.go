package main

import (
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/stockbroker/api-gateway/config"
	"github.com/stockbroker/api-gateway/proxy"
)

func main() {
	cfg := config.Load()

	r := gin.Default()

	// CORS — allow all (dev mode)
	r.Use(cors.New(cors.Config{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		AllowCredentials: true,
	}))

	// Health & root
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "api-gateway"})
	})
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": cfg.AppName,
			"version": "1.0.0",
			"health":  "/health",
		})
	})

	// Proxy routes
	identity := r.Group("/api/identity")
	identity.Any("/*path", proxy.Forward(cfg.IdentityServiceURL))

	portfolio := r.Group("/api/portfolio")
	portfolio.Any("/*path", proxy.Forward(cfg.PortfolioServiceURL))

	orders := r.Group("/api/orders")
	orders.Any("/*path", proxy.Forward(cfg.OrderServiceURL))

	prices := r.Group("/api/prices")
	prices.Any("/*path", proxy.Forward(cfg.PriceUpdateServiceURL))

	log.Printf("🚀 %s running on :%s", cfg.AppName, cfg.AppPort)
	r.Run(":" + cfg.AppPort)
}
