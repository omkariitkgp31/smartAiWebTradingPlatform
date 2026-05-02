package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Notification struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	UserID    string    `gorm:"index;size:36;not null" json:"user_id"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Message   string    `gorm:"type:text;not null" json:"message"`
	OrderID   string    `gorm:"size:36" json:"order_id"`
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	n.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&Notification{})
}
