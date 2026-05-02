package repository

import (
	"fmt"
	"time"

	"open_soft_3/config"
	"open_soft_3/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func NewDatabase(cfg *config.Config) (*gorm.DB, error) {
	var dialector gorm.Dialector
	switch cfg.DBDriver {
	case "postgres":
		dialector = postgres.Open(cfg.DSN())
	case "mysql":
		dialector = mysql.Open(cfg.DSN())
	default:
		return nil, fmt.Errorf("unsupported DB_DRIVER: %s", cfg.DBDriver)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		PrepareStmt: true,
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("database handle: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DBConnMaxLifetimeMinutes) * time.Minute)

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&models.User{}, &models.OTP{})
}
