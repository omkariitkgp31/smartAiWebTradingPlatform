package database

import (
	"log"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"github.com/stockbroker/notification-service/config"
)

var DB *gorm.DB

func Connect(cfg *config.Config) {
	var err error
	DB, err = gorm.Open(mysql.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("✅ Database connected")
}
