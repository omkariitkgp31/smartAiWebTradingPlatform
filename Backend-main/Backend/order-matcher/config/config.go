package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	AppName          string
	AppPort          string
	DatabaseURL      string
	TradeExecutorURL string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		AppName:          getEnv("APP_NAME", "Order Matcher"),
		AppPort:          getEnv("APP_PORT", "8086"),
		DatabaseURL:      getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_matcher?charset=utf8mb4&parseTime=True&loc=Local"),
		TradeExecutorURL: getEnv("TRADE_EXECUTOR_URL", "http://localhost:8087"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
