package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	AppName     string
	AppPort     string
	DatabaseURL string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		AppName:     getEnv("APP_NAME", "Trade History"),
		AppPort:     getEnv("APP_PORT", "8089"),
		DatabaseURL: getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_history?charset=utf8mb4&parseTime=True&loc=Local"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
