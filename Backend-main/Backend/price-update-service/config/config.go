package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	AppName      string
	AppPort      string
	DatabaseURL  string
	JWTSecretKey string
	DebeziumURL  string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		AppName:      getEnv("APP_NAME", "Price Update Service"),
		AppPort:      getEnv("APP_PORT", "8084"),
		DatabaseURL:  getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_prices?charset=utf8mb4&parseTime=True&loc=Local"),
		JWTSecretKey: getEnv("JWT_SECRET_KEY", "your-super-secret-key-change-in-production"),
		DebeziumURL:  getEnv("DEBEZIUM_URL", "http://localhost:8083/connectors"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
