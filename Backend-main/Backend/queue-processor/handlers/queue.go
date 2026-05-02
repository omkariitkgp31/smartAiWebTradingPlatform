package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/stockbroker/queue-processor/database"
	"github.com/stockbroker/queue-processor/dispatcher"
	"github.com/stockbroker/queue-processor/models"
)

type OrderEvent struct {
	OrderID     string  `json:"order_id" binding:"required"`
	UserID      string  `json:"user_id" binding:"required"`
	StockSymbol string  `json:"stock_symbol" binding:"required"`
	OrderType   string  `json:"order_type" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	Price       float64 `json:"price" binding:"required,gt=0"`
}

// ProcessBuy handles POST /buy
func ProcessBuy(c *gin.Context) {
	processEvent(c, models.EventBuy)
}

// ProcessSell handles POST /sell
func ProcessSell(c *gin.Context) {
	processEvent(c, models.EventSell)
}

func processEvent(c *gin.Context, eventType models.EventType) {
	var event OrderEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Store event
	dbEvent := models.ProcessedEvent{
		OrderID:     event.OrderID,
		UserID:      event.UserID,
		StockSymbol: strings.ToUpper(event.StockSymbol),
		EventType:   eventType,
		Quantity:    event.Quantity,
		Price:       event.Price,
		Status:      models.StatusProcessing,
	}
	database.DB.Create(&dbEvent)

	// Fan-out
	orderData := map[string]interface{}{
		"order_id":     event.OrderID,
		"user_id":      event.UserID,
		"stock_symbol": strings.ToUpper(event.StockSymbol),
		"order_type":   string(eventType),
		"quantity":     event.Quantity,
		"price":        event.Price,
	}
	results := dispatcher.FanOut(orderData)

	// Determine status
	successCount := 0
	for _, r := range results {
		if r.Success {
			successCount++
		}
	}
	now := time.Now()
	if successCount == len(results) {
		dbEvent.Status = models.StatusDispatched
	} else if successCount > 0 {
		dbEvent.Status = models.StatusPartialFailure
	} else {
		dbEvent.Status = models.StatusFailed
	}
	dbEvent.ProcessedAt = &now
	resultsJSON, _ := json.Marshal(results)
	dbEvent.DispatchResults = resultsJSON
	database.DB.Save(&dbEvent)

	c.JSON(http.StatusAccepted, gin.H{
		"event_id":         dbEvent.ID,
		"order_id":         event.OrderID,
		"event_type":       string(eventType),
		"status":           string(dbEvent.Status),
		"dispatch_results": results,
		"message":          fmt.Sprintf("Dispatched to %d/%d targets", successCount, len(results)),
	})
}

// ListEvents handles GET /events
func ListEvents(c *gin.Context) {
	var events []models.ProcessedEvent
	query := database.DB

	if t := c.Query("event_type"); t != "" {
		query = query.Where("event_type = ?", t)
	}
	if s := c.Query("status"); s != "" {
		query = query.Where("status = ?", s)
	}
	query.Order("created_at DESC").Limit(50).Find(&events)

	c.JSON(http.StatusOK, gin.H{"events": events, "total": len(events)})
}
