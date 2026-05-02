package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	AppName          string
	AppPort          string
	DatabaseURL      string
	MarketServiceURL string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		AppName:          getEnv("APP_NAME", "Trade Executor"),
		AppPort:          getEnv("APP_PORT", "8087"),
		DatabaseURL:      getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_trades?charset=utf8mb4&parseTime=True&loc=Local"),
		MarketServiceURL: getEnv("MARKET_SERVICE_URL", "http://localhost:8088"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
