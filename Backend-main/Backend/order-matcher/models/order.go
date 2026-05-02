package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MatchStatus string

const (
	MatchPending  MatchStatus = "PENDING"
	MatchMatched  MatchStatus = "MATCHED"
	MatchPartial  MatchStatus = "PARTIAL"
	MatchExpired  MatchStatus = "EXPIRED"
)

// OrderEntry is an order waiting to be matched in the book
type OrderEntry struct {
	ID          string      `gorm:"primaryKey;size:36" json:"id"`
	OrderID     string      `gorm:"index;size:36;not null" json:"order_id"`
	UserID      string      `gorm:"size:36;not null" json:"user_id"`
	StockSymbol string      `gorm:"index;size:20;not null" json:"stock_symbol"`
	Side        string      `gorm:"size:10;not null" json:"side"` // BUY or SELL
	Quantity    float64     `gorm:"not null" json:"quantity"`
	Price       float64     `gorm:"not null" json:"price"`
	Remaining   float64     `gorm:"not null" json:"remaining"`
	Status      MatchStatus `gorm:"size:20;default:PENDING" json:"status"`
	CreatedAt   time.Time   `json:"created_at"`
}

func (o *OrderEntry) BeforeCreate(tx *gorm.DB) error {
	o.ID = uuid.New().String()
	return nil
}

// MatchResult records a successful match between a buy and sell order
type MatchResult struct {
	ID           string    `gorm:"primaryKey;size:36" json:"id"`
	BuyOrderID   string    `gorm:"index;size:36;not null" json:"buy_order_id"`
	SellOrderID  string    `gorm:"index;size:36;not null" json:"sell_order_id"`
	StockSymbol  string    `gorm:"size:20;not null" json:"stock_symbol"`
	Quantity     float64   `gorm:"not null" json:"quantity"`
	Price        float64   `gorm:"not null" json:"price"`
	MatchedAt    time.Time `gorm:"autoCreateTime" json:"matched_at"`
}

func (m *MatchResult) BeforeCreate(tx *gorm.DB) error {
	m.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&OrderEntry{}, &MatchResult{})
}
