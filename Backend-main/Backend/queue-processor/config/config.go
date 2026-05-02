package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	AppName              string
	AppPort              string
	DatabaseURL          string
	OrderMatcherURL      string
	MarketTopicURL       string
	NotificationURL      string
	PortfolioServiceURL  string
	PriceUpdateServiceURL string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		AppName:              getEnv("APP_NAME", "Queue Processor"),
		AppPort:              getEnv("APP_PORT", "8085"),
		DatabaseURL:          getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_queue?charset=utf8mb4&parseTime=True&loc=Local"),
		OrderMatcherURL:      getEnv("ORDER_MATCHER_URL", "http://localhost:8086"),
		MarketTopicURL:       getEnv("MARKET_TOPIC_URL", "http://localhost:8089"),
		NotificationURL:      getEnv("NOTIFICATION_URL", "http://localhost:8090"),
		PortfolioServiceURL:  getEnv("PORTFOLIO_SERVICE_URL", "http://localhost:8082"),
		PriceUpdateServiceURL: getEnv("PRICE_UPDATE_SERVICE_URL", "http://localhost:8084"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
