package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/stockbroker/trade-history/database"
	"github.com/stockbroker/trade-history/models"
)

type RecordReq struct {
	EventID     string  `json:"event_id"`
	TradeID     string  `json:"trade_id"`
	StockSymbol string  `json:"stock_symbol" binding:"required"`
	EventType   string  `json:"event_type" binding:"required"`
	Price       float64 `json:"price" binding:"required"`
	Quantity    float64 `json:"quantity"`
	TotalValue  float64 `json:"total_value"`
}

// Record stores a history record from Market Service
func Record(c *gin.Context) {
	var req RecordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	record := models.HistoryRecord{
		EventID:     req.EventID,
		TradeID:     req.TradeID,
		StockSymbol: strings.ToUpper(req.StockSymbol),
		EventType:   req.EventType,
		Price:       req.Price,
		Quantity:    req.Quantity,
		TotalValue:  req.TotalValue,
	}
	database.DB.Create(&record)
	c.JSON(http.StatusCreated, gin.H{"message": "History recorded", "id": record.ID})
}

// GetHistory returns trade history with filters
func GetHistory(c *gin.Context) {
	var records []models.HistoryRecord
	query := database.DB
	if s := c.Query("symbol"); s != "" {
		query = query.Where("stock_symbol = ?", strings.ToUpper(s))
	}
	if t := c.Query("event_type"); t != "" {
		query = query.Where("event_type = ?", t)
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	query.Order("recorded_at DESC").Limit(limit).Find(&records)
	c.JSON(http.StatusOK, gin.H{"history": records, "total": len(records)})
}

// GetBySymbol returns history for a specific symbol
func GetBySymbol(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	var records []models.HistoryRecord
	database.DB.Where("stock_symbol = ?", symbol).Order("recorded_at DESC").Limit(limit).Find(&records)
	c.JSON(http.StatusOK, gin.H{"symbol": symbol, "history": records, "total": len(records)})
}
