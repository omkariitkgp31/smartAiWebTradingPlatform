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
		AppName:     getEnv("APP_NAME", "Notification Service"),
		AppPort:     getEnv("APP_PORT", "8090"),
		DatabaseURL: getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_notifications?charset=utf8mb4&parseTime=True&loc=Local"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
