package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Company struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	Symbol        string    `gorm:"uniqueIndex;size:20;not null" json:"symbol"`
	Name          string    `gorm:"size:255;not null" json:"name"`
	Sector        string    `gorm:"size:100" json:"sector"`
	Description   string    `gorm:"type:text" json:"description"`
	CurrentPrice  float64   `gorm:"not null;default:0" json:"current_price"`
	PreviousClose *float64  `json:"previous_close"`
	DayHigh       *float64  `json:"day_high"`
	DayLow        *float64  `json:"day_low"`
	Volume        float64   `gorm:"default:0" json:"volume"`
	MarketCap     *float64  `json:"market_cap"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (c *Company) BeforeCreate(tx *gorm.DB) error {
	c.ID = uuid.New().String()
	return nil
}

type PriceHistory struct {
	ID            string    `gorm:"primaryKey;size:36" json:"id"`
	Symbol        string    `gorm:"index;size:20;not null" json:"symbol"`
	Price         float64   `gorm:"not null" json:"price"`
	Change        *float64  `json:"change"`
	ChangePercent *float64  `json:"change_percent"`
	Source        string    `gorm:"size:50" json:"source"`
	CapturedAt    time.Time `gorm:"autoCreateTime" json:"captured_at"`
}

func (p *PriceHistory) BeforeCreate(tx *gorm.DB) error {
	p.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&Company{}, &PriceHistory{})
}
