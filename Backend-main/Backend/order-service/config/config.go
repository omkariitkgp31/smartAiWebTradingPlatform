package config

import (
	"os"
	"github.com/joho/godotenv"
)

type Config struct {
	AppName           string
	AppPort           string
	DatabaseURL       string
	JWTSecretKey      string
	JWTAlgorithm      string
	QueueProcessorURL string
}

func Load() *Config {
	godotenv.Load()
	return &Config{
		AppName:           getEnv("APP_NAME", "Order Service"),
		AppPort:           getEnv("APP_PORT", "8083"),
		DatabaseURL:       getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_orders?charset=utf8mb4&parseTime=True&loc=Local"),
		JWTSecretKey:      getEnv("JWT_SECRET_KEY", "your-super-secret-key-change-in-production"),
		JWTAlgorithm:      getEnv("JWT_ALGORITHM", "HS256"),
		QueueProcessorURL: getEnv("QUEUE_PROCESSOR_URL", "http://localhost:8085"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
