package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type HistoryRecord struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	EventID     string    `gorm:"index;size:36" json:"event_id"`
	TradeID     string    `gorm:"index;size:36" json:"trade_id"`
	StockSymbol string    `gorm:"index;size:20;not null" json:"stock_symbol"`
	EventType   string    `gorm:"size:30;not null" json:"event_type"`
	Price       float64   `gorm:"not null" json:"price"`
	Quantity    float64   `json:"quantity"`
	TotalValue  float64   `json:"total_value"`
	RecordedAt  time.Time `gorm:"autoCreateTime" json:"recorded_at"`
}

func (h *HistoryRecord) BeforeCreate(tx *gorm.DB) error {
	h.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&HistoryRecord{})
}
