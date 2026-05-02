package handlers

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/stockbroker/market-service/config"
	"github.com/stockbroker/market-service/database"
	"github.com/stockbroker/market-service/models"
)

var cfg *config.Config

func Init(c *config.Config) { cfg = c }

type TradeEventReq struct {
	TradeID     string  `json:"trade_id"`
	StockSymbol string  `json:"stock_symbol" binding:"required"`
	Quantity    float64 `json:"quantity"`
	Price       float64 `json:"price" binding:"required"`
	TotalValue  float64 `json:"total_value"`
}

type PublishReq struct {
	OrderID     string  `json:"order_id"`
	UserID      string  `json:"user_id"`
	StockSymbol string  `json:"stock_symbol" binding:"required"`
	OrderType   string  `json:"order_type"`
	Quantity    float64 `json:"quantity"`
	Price       float64 `json:"price" binding:"required"`
}

// TradeEvent receives executed trade from Trade Executor
func TradeEvent(c *gin.Context) {
	var req TradeEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	symbol := strings.ToUpper(req.StockSymbol)

	// Record market event
	event := models.MarketEvent{
		StockSymbol: symbol,
		EventType:   "TRADE",
		Price:       req.Price,
		Quantity:    req.Quantity,
		TotalValue:  req.TotalValue,
		TradeID:     req.TradeID,
	}
	database.DB.Create(&event)

	// Update market summary (OHLCV)
	var summary models.MarketSummary
	if database.DB.Where("stock_symbol = ?", symbol).First(&summary).Error != nil {
		summary = models.MarketSummary{
			StockSymbol: symbol, Open: req.Price, High: req.Price,
			Low: req.Price, Close: req.Price, Volume: req.Quantity, TradeCount: 1,
		}
		database.DB.Create(&summary)
	} else {
		if req.Price > summary.High {
			summary.High = req.Price
		}
		if req.Price < summary.Low {
			summary.Low = req.Price
		}
		summary.Close = req.Price
		summary.Volume += req.Quantity
		summary.TradeCount++
		database.DB.Save(&summary)
	}

	// Forward to Trade History
	go dispatchToTradeHistory(event)

	c.JSON(http.StatusOK, gin.H{"message": "Market event recorded"})
}

// Publish receives market events from Queue Processor
func Publish(c *gin.Context) {
	var req PublishReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	event := models.MarketEvent{
		StockSymbol: strings.ToUpper(req.StockSymbol),
		EventType:   "ORDER_" + strings.ToUpper(req.OrderType),
		Price:       req.Price,
		Quantity:    req.Quantity,
	}
	database.DB.Create(&event)
	c.JSON(http.StatusOK, gin.H{"message": "Published to market"})
}

// GetFeed returns recent market events
func GetFeed(c *gin.Context) {
	var events []models.MarketEvent
	query := database.DB
	if s := c.Query("symbol"); s != "" {
		query = query.Where("stock_symbol = ?", strings.ToUpper(s))
	}
	query.Order("created_at DESC").Limit(100).Find(&events)
	c.JSON(http.StatusOK, gin.H{"feed": events, "total": len(events)})
}

// GetSummary returns market summary for a symbol
func GetSummary(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	var summary models.MarketSummary
	if err := database.DB.Where("stock_symbol = ?", symbol).First(&summary).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": symbol + " not found"})
		return
	}
	c.JSON(http.StatusOK, summary)
}

// GetAllSummaries returns all market summaries
func GetAllSummaries(c *gin.Context) {
	var summaries []models.MarketSummary
	database.DB.Find(&summaries)
	c.JSON(http.StatusOK, gin.H{"summaries": summaries, "total": len(summaries)})
}

func dispatchToTradeHistory(e models.MarketEvent) {
	body, _ := json.Marshal(map[string]interface{}{
		"event_id":     e.ID,
		"stock_symbol": e.StockSymbol,
		"event_type":   e.EventType,
		"price":        e.Price,
		"quantity":     e.Quantity,
		"total_value":  e.TotalValue,
		"trade_id":     e.TradeID,
	})
	resp, err := http.Post(cfg.TradeHistoryURL+"/record", "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("⚠️ Trade History unreachable: %v", err)
		return
	}
	defer resp.Body.Close()
}
