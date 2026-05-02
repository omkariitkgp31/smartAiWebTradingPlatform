package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TransactionType string

const (
	TxBuy      TransactionType = "BUY"
	TxSell     TransactionType = "SELL"
	TxDividend TransactionType = "DIVIDEND"
)

type Holding struct {
	ID              string    `gorm:"primaryKey;size:36" json:"id"`
	UserID          string    `gorm:"index;size:36;not null" json:"user_id"`
	StockSymbol     string    `gorm:"index;size:20;not null" json:"stock_symbol"`
	Quantity        float64   `gorm:"not null;default:0" json:"quantity"`
	AverageBuyPrice float64   `gorm:"not null;default:0" json:"average_buy_price"`
	TotalInvested   float64   `gorm:"not null;default:0" json:"total_invested"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (h *Holding) BeforeCreate(tx *gorm.DB) error {
	h.ID = uuid.New().String()
	return nil
}

type Transaction struct {
	ID              string          `gorm:"primaryKey;size:36" json:"id"`
	UserID          string          `gorm:"index;size:36;not null" json:"user_id"`
	OrderID         string          `gorm:"size:36" json:"order_id"`
	StockSymbol     string          `gorm:"size:20;not null" json:"stock_symbol"`
	TransactionType TransactionType `gorm:"size:20;not null" json:"transaction_type"`
	Quantity        float64         `gorm:"not null" json:"quantity"`
	Price           float64         `gorm:"not null" json:"price"`
	TotalAmount     float64         `gorm:"not null" json:"total_amount"`
	CreatedAt       time.Time       `json:"created_at"`
}

func (t *Transaction) BeforeCreate(tx *gorm.DB) error {
	t.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&Holding{}, &Transaction{})
}
