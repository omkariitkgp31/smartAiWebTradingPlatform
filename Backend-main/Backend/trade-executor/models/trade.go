package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TradeStatus string

const (
	TradeExecuted TradeStatus = "EXECUTED"
	TradeFailed   TradeStatus = "FAILED"
	TradeSettled   TradeStatus = "SETTLED"
)

type Trade struct {
	ID          string      `gorm:"primaryKey;size:36" json:"id"`
	MatchID     string      `gorm:"index;size:36;not null" json:"match_id"`
	BuyOrderID  string      `gorm:"index;size:36;not null" json:"buy_order_id"`
	SellOrderID string      `gorm:"index;size:36;not null" json:"sell_order_id"`
	StockSymbol string      `gorm:"size:20;not null" json:"stock_symbol"`
	Quantity    float64     `gorm:"not null" json:"quantity"`
	Price       float64     `gorm:"not null" json:"price"`
	TotalValue  float64     `gorm:"not null" json:"total_value"`
	Status      TradeStatus `gorm:"size:20;default:EXECUTED" json:"status"`
	ExecutedAt  time.Time   `gorm:"autoCreateTime" json:"executed_at"`
}

func (t *Trade) BeforeCreate(tx *gorm.DB) error {
	t.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&Trade{})
}
