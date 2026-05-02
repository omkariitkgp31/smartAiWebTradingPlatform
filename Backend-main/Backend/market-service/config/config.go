package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	AppName         string
	AppPort         string
	DatabaseURL     string
	TradeHistoryURL string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		AppName:         getEnv("APP_NAME", "Market Service"),
		AppPort:         getEnv("APP_PORT", "8088"),
		DatabaseURL:     getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_market?charset=utf8mb4&parseTime=True&loc=Local"),
		TradeHistoryURL: getEnv("TRADE_HISTORY_URL", "http://localhost:8089"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
