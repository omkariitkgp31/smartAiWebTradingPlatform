package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName                  string
	AppPort                  string
	DatabaseURL              string
	JWTSecretKey             string
	JWTAlgorithm             string
	AccessTokenExpireMinutes int
	RefreshTokenExpireDays   int
}

func Load() *Config {
	godotenv.Load()
	accessExp, _ := strconv.Atoi(getEnv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
	refreshExp, _ := strconv.Atoi(getEnv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

	return &Config{
		AppName:                  getEnv("APP_NAME", "Identity Service"),
		AppPort:                  getEnv("APP_PORT", "8081"),
		DatabaseURL:              getEnv("DATABASE_URL", "root:password@tcp(localhost:3306)/stockbroker_identity?charset=utf8mb4&parseTime=True&loc=Local"),
		JWTSecretKey:             getEnv("JWT_SECRET_KEY", "your-super-secret-key-change-in-production"),
		JWTAlgorithm:             getEnv("JWT_ALGORITHM", "HS256"),
		AccessTokenExpireMinutes: accessExp,
		RefreshTokenExpireDays:   refreshExp,
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
