package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv string

	ServerPort         string
	ServerReadTimeout  int
	ServerWriteTimeout int

	DBDriver                 string
	DBHost                   string
	DBPort                   string
	DBUser                   string
	DBPassword               string
	DBName                   string
	DBSSLMode                string
	DBMaxOpenConns           int
	DBMaxIdleConns           int
	DBConnMaxLifetimeMinutes int

	JWTSecret          string
	JWTIssuer          string
	AccessTokenMinutes int
	RefreshTokenHours  int

	OTPHashPepper               string
	OTPExpiryMinutes            int
	OTPResendCooldownSeconds    int
	OTPMaxRequestsPerHour       int
	OTPMaxVerificationAttempts  int
	LoginMaxAttemptsPer15Minute int

	GlobalRateLimitRPS   int
	GlobalRateLimitBurst int

	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
	SMTPMock     bool

	CleanupIntervalMinutes int
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		AppEnv: strings.ToLower(getEnv("APP_ENV", "development")),

		ServerPort:         getEnv("SERVER_PORT", "8080"),
		ServerReadTimeout:  getEnvAsInt("SERVER_READ_TIMEOUT_SECONDS", 10),
		ServerWriteTimeout: getEnvAsInt("SERVER_WRITE_TIMEOUT_SECONDS", 10),

		DBDriver:                 strings.ToLower(getEnv("DB_DRIVER", "postgres")),
		DBHost:                   getEnv("DB_HOST", "localhost"),
		DBPort:                   getEnv("DB_PORT", "5432"),
		DBUser:                   getEnv("DB_USER", "postgres"),
		DBPassword:               getEnv("DB_PASSWORD", "postgres"),
		DBName:                   getEnv("DB_NAME", "auth_db"),
		DBSSLMode:                getEnv("DB_SSL_MODE", "disable"),
		DBMaxOpenConns:           getEnvAsInt("DB_MAX_OPEN_CONNS", 30),
		DBMaxIdleConns:           getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
		DBConnMaxLifetimeMinutes: getEnvAsInt("DB_CONN_MAX_LIFETIME_MINUTES", 15),

		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTIssuer:          getEnv("JWT_ISSUER", "open-soft-auth"),
		AccessTokenMinutes: getEnvAsInt("JWT_ACCESS_TOKEN_MINUTES", 15),
		RefreshTokenHours:  getEnvAsInt("JWT_REFRESH_TOKEN_HOURS", 168),

		OTPHashPepper:               getEnv("OTP_HASH_PEPPER", ""),
		OTPExpiryMinutes:            getEnvAsInt("OTP_EXPIRY_MINUTES", 10),
		OTPResendCooldownSeconds:    getEnvAsInt("OTP_RESEND_COOLDOWN_SECONDS", 60),
		OTPMaxRequestsPerHour:       getEnvAsInt("OTP_MAX_REQUESTS_PER_HOUR", 5),
		OTPMaxVerificationAttempts:  getEnvAsInt("OTP_MAX_VERIFICATION_ATTEMPTS", 5),
		LoginMaxAttemptsPer15Minute: getEnvAsInt("LOGIN_MAX_ATTEMPTS_PER_15_MINUTES", 10),

		GlobalRateLimitRPS:   getEnvAsInt("GLOBAL_RATE_LIMIT_RPS", 5),
		GlobalRateLimitBurst: getEnvAsInt("GLOBAL_RATE_LIMIT_BURST", 20),

		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),
		SMTPMock:     getEnvAsBool("SMTP_MOCK", false),

		CleanupIntervalMinutes: getEnvAsInt("OTP_CLEANUP_INTERVAL_MINUTES", 2),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) DSN() string {
	switch c.DBDriver {
	case "postgres":
		return fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
			c.DBHost,
			c.DBPort,
			c.DBUser,
			c.DBPassword,
			c.DBName,
			c.DBSSLMode,
		)
	case "mysql":
		return fmt.Sprintf(
			"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC",
			c.DBUser,
			c.DBPassword,
			c.DBHost,
			c.DBPort,
			c.DBName,
		)
	default:
		return ""
	}
}

func (c *Config) validate() error {
	if c.DBDriver != "postgres" && c.DBDriver != "mysql" {
		return fmt.Errorf("unsupported DB_DRIVER: %s", c.DBDriver)
	}
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}
	if c.OTPHashPepper == "" {
		return fmt.Errorf("OTP_HASH_PEPPER is required")
	}
	if c.OTPExpiryMinutes < 5 || c.OTPExpiryMinutes > 10 {
		return fmt.Errorf("OTP_EXPIRY_MINUTES must be between 5 and 10")
	}
	if !c.SMTPMock {
		if c.SMTPHost == "" || c.SMTPPort == "" || c.SMTPUsername == "" || c.SMTPPassword == "" || c.SMTPFrom == "" {
			return fmt.Errorf("SMTP credentials are required when SMTP_MOCK=false")
		}
	}
	return nil
}

func getEnv(key, fallback string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	return val
}

func getEnvAsInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}

func getEnvAsBool(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	v, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return v
}
