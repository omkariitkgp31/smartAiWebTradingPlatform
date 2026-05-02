package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OTP struct {
	ID        uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	Email     string    `gorm:"size:320;not null;index:idx_otps_email;index:idx_otps_email_expires,priority:1" json:"email"`
	OTPHash   string    `gorm:"size:64;not null" json:"-"`
	ExpiresAt time.Time `gorm:"not null;index:idx_otps_expires_at;index:idx_otps_email_expires,priority:2" json:"expires_at"`
	Attempts  int       `gorm:"not null;default:0" json:"attempts"`
	CreatedAt time.Time `json:"created_at"`
}

func (OTP) TableName() string {
	return "otps"
}

func (o *OTP) BeforeCreate(_ *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}
