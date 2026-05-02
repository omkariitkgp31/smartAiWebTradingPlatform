package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MarketEvent stores a market feed event (trade, price change, volume)
type MarketEvent struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	StockSymbol string    `gorm:"index;size:20;not null" json:"stock_symbol"`
	EventType   string    `gorm:"size:30;not null" json:"event_type"` // TRADE, PRICE_UPDATE, VOLUME
	Price       float64   `gorm:"not null" json:"price"`
	Quantity    float64   `json:"quantity"`
	TotalValue  float64   `json:"total_value"`
	TradeID     string    `gorm:"size:36" json:"trade_id"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (m *MarketEvent) BeforeCreate(tx *gorm.DB) error {
	m.ID = uuid.New().String()
	return nil
}

// MarketSummary stores daily market summary per stock
type MarketSummary struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	StockSymbol string    `gorm:"uniqueIndex;size:20;not null" json:"stock_symbol"`
	Open        float64   `json:"open"`
	High        float64   `json:"high"`
	Low         float64   `json:"low"`
	Close       float64   `json:"close"`
	Volume      float64   `json:"volume"`
	TradeCount  int       `json:"trade_count"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (m *MarketSummary) BeforeCreate(tx *gorm.DB) error {
	m.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&MarketEvent{}, &MarketSummary{})
}
