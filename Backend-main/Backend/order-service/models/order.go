package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderType string
type OrderStatus string

const (
	OrderTypeBuy  OrderType = "BUY"
	OrderTypeSell OrderType = "SELL"

	StatusPending   OrderStatus = "PENDING"
	StatusPlaced    OrderStatus = "PLACED"
	StatusMatched   OrderStatus = "MATCHED"
	StatusExecuted  OrderStatus = "EXECUTED"
	StatusCancelled OrderStatus = "CANCELLED"
	StatusFailed    OrderStatus = "FAILED"
)

type Order struct {
	ID          string      `gorm:"primaryKey;size:36" json:"id"`
	UserID      string      `gorm:"index;size:36;not null" json:"user_id"`
	StockSymbol string      `gorm:"index;size:20;not null" json:"stock_symbol"`
	OrderType   OrderType   `gorm:"size:10;not null" json:"order_type"`
	Quantity    float64     `gorm:"not null" json:"quantity"`
	Price       float64     `gorm:"not null" json:"price"`
	Status      OrderStatus `gorm:"size:20;default:PENDING" json:"status"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

func (o *Order) BeforeCreate(tx *gorm.DB) error {
	o.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&Order{})
}
