package handlers

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/stockbroker/trade-executor/config"
	"github.com/stockbroker/trade-executor/database"
	"github.com/stockbroker/trade-executor/models"
)

var cfg *config.Config

func Init(c *config.Config) { cfg = c }

type ExecuteRequest struct {
	MatchID     string  `json:"match_id" binding:"required"`
	BuyOrderID  string  `json:"buy_order_id" binding:"required"`
	SellOrderID string  `json:"sell_order_id" binding:"required"`
	StockSymbol string  `json:"stock_symbol" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	Price       float64 `json:"price" binding:"required,gt=0"`
}

// Execute processes a matched trade from Order Matcher
func Execute(c *gin.Context) {
	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	trade := models.Trade{
		MatchID:     req.MatchID,
		BuyOrderID:  req.BuyOrderID,
		SellOrderID: req.SellOrderID,
		StockSymbol: strings.ToUpper(req.StockSymbol),
		Quantity:    req.Quantity,
		Price:       req.Price,
		TotalValue:  req.Quantity * req.Price,
		Status:      models.TradeExecuted,
	}

	if err := database.DB.Create(&trade).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute trade"})
		return
	}

	// Notify Market Service
	go dispatchToMarketService(trade)

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Trade executed",
		"trade_id": trade.ID,
		"trade":    trade,
	})
}

// ListTrades returns trade history
func ListTrades(c *gin.Context) {
	var trades []models.Trade
	query := database.DB
	if s := c.Query("symbol"); s != "" {
		query = query.Where("stock_symbol = ?", strings.ToUpper(s))
	}
	if st := c.Query("status"); st != "" {
		query = query.Where("status = ?", st)
	}
	query.Order("executed_at DESC").Limit(100).Find(&trades)
	c.JSON(http.StatusOK, gin.H{"trades": trades, "total": len(trades)})
}

// GetTrade returns a single trade
func GetTrade(c *gin.Context) {
	var trade models.Trade
	if err := database.DB.First(&trade, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Trade not found"})
		return
	}
	c.JSON(http.StatusOK, trade)
}

func dispatchToMarketService(t models.Trade) {
	body, _ := json.Marshal(map[string]interface{}{
		"trade_id":     t.ID,
		"stock_symbol": t.StockSymbol,
		"quantity":     t.Quantity,
		"price":        t.Price,
		"total_value":  t.TotalValue,
		"executed_at":  t.ExecutedAt,
	})
	resp, err := http.Post(cfg.MarketServiceURL+"/trade-event", "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("⚠️ Market Service unreachable: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("✅ Trade %s sent to Market Service: %d", t.ID, resp.StatusCode)
}
