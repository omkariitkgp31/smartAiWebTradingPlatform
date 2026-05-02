package models

import (
	"time"

	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventType string
type EventStatus string

const (
	EventBuy  EventType = "BUY"
	EventSell EventType = "SELL"

	StatusReceived       EventStatus = "RECEIVED"
	StatusProcessing     EventStatus = "PROCESSING"
	StatusDispatched     EventStatus = "DISPATCHED"
	StatusPartialFailure EventStatus = "PARTIAL_FAILURE"
	StatusFailed         EventStatus = "FAILED"
)

type ProcessedEvent struct {
	ID              string         `gorm:"primaryKey;size:36" json:"id"`
	OrderID         string         `gorm:"index;size:36;not null" json:"order_id"`
	UserID          string         `gorm:"size:36;not null" json:"user_id"`
	StockSymbol     string         `gorm:"size:20;not null" json:"stock_symbol"`
	EventType       EventType      `gorm:"size:10;not null" json:"event_type"`
	Quantity        float64        `gorm:"not null" json:"quantity"`
	Price           float64        `gorm:"not null" json:"price"`
	Status          EventStatus    `gorm:"size:20;default:RECEIVED" json:"status"`
	DispatchResults json.RawMessage `json:"dispatch_results"`
	CreatedAt       time.Time      `json:"created_at"`
	ProcessedAt     *time.Time     `json:"processed_at"`
}

func (e *ProcessedEvent) BeforeCreate(tx *gorm.DB) error {
	e.ID = uuid.New().String()
	return nil
}

func AutoMigrate(db *gorm.DB) {
	db.AutoMigrate(&ProcessedEvent{})
}
