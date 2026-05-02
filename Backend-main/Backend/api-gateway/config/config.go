package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName              string
	AppPort              string
	IdentityServiceURL   string
	PortfolioServiceURL  string
	OrderServiceURL      string
	PriceUpdateServiceURL string
}

func Load() *Config {
	godotenv.Load()

	return &Config{
		AppName:              getEnv("APP_NAME", "API Gateway"),
		AppPort:              getEnv("APP_PORT", "8080"),
		IdentityServiceURL:   getEnv("IDENTITY_SERVICE_URL", "http://localhost:8081"),
		PortfolioServiceURL:  getEnv("PORTFOLIO_SERVICE_URL", "http://localhost:8082"),
		OrderServiceURL:      getEnv("ORDER_SERVICE_URL", "http://localhost:8083"),
		PriceUpdateServiceURL: getEnv("PRICE_UPDATE_SERVICE_URL", "http://localhost:8084"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
