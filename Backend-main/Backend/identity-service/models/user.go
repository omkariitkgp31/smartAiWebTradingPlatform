package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID             string    `gorm:"primaryKey;size:36" json:"id"`
	Email          string    `gorm:"uniqueIndex;size:255;not null" json:"email"`
	Username       string    `gorm:"uniqueIndex;size:100;not null" json:"username"`
	HashedPassword string    `gorm:"size:255;not null" json:"-"`
	FullName       string    `gorm:"size:255" json:"full_name"`
	IsActive       bool      `gorm:"default:true" json:"is_active"`
	IsVerified     bool      `gorm:"default:false" json:"is_verified"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	u.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&User{})
}
