package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/stockbroker/order-matcher/config"
	"github.com/stockbroker/order-matcher/database"
	"github.com/stockbroker/order-matcher/models"
)

var cfg *config.Config

func Init(c *config.Config) { cfg = c }

type MatchRequest struct {
	OrderID     string  `json:"order_id" binding:"required"`
	UserID      string  `json:"user_id" binding:"required"`
	StockSymbol string  `json:"stock_symbol" binding:"required"`
	OrderType   string  `json:"order_type" binding:"required"` // BUY or SELL
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	Price       float64 `json:"price" binding:"required,gt=0"`
}

// Match receives an order from Queue Processor and tries to match it
func Match(c *gin.Context) {
	var req MatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	symbol := strings.ToUpper(req.StockSymbol)
	side := strings.ToUpper(req.OrderType)

	// Add to book
	entry := models.OrderEntry{
		OrderID:     req.OrderID,
		UserID:      req.UserID,
		StockSymbol: symbol,
		Side:        side,
		Quantity:    req.Quantity,
		Price:       req.Price,
		Remaining:   req.Quantity,
		Status:      models.MatchPending,
	}
	database.DB.Create(&entry)

	// Try to match: BUY matches lowest SELL <= buy price, SELL matches highest BUY >= sell price
	var matches []models.MatchResult
	remaining := req.Quantity

	if side == "BUY" {
		// Find sell orders at or below buy price, ordered by price ASC (best price first), then time
		var sells []models.OrderEntry
		database.DB.Where("stock_symbol = ? AND side = ? AND status = ? AND price <= ?",
			symbol, "SELL", models.MatchPending, req.Price).
			Order("price ASC, created_at ASC").Find(&sells)

		for i := range sells {
			if remaining <= 0 {
				break
			}
			matchQty := min(remaining, sells[i].Remaining)
			match := models.MatchResult{
				BuyOrderID:  req.OrderID,
				SellOrderID: sells[i].OrderID,
				StockSymbol: symbol,
				Quantity:    matchQty,
				Price:       sells[i].Price,
			}
			database.DB.Create(&match)
			matches = append(matches, match)

			sells[i].Remaining -= matchQty
			if sells[i].Remaining <= 0 {
				sells[i].Status = models.MatchMatched
			} else {
				sells[i].Status = models.MatchPartial
			}
			database.DB.Save(&sells[i])
			remaining -= matchQty
		}
	} else {
		// Find buy orders at or above sell price, ordered by price DESC (best price first), then time
		var buys []models.OrderEntry
		database.DB.Where("stock_symbol = ? AND side = ? AND status = ? AND price >= ?",
			symbol, "BUY", models.MatchPending, req.Price).
			Order("price DESC, created_at ASC").Find(&buys)

		for i := range buys {
			if remaining <= 0 {
				break
			}
			matchQty := min(remaining, buys[i].Remaining)
			match := models.MatchResult{
				BuyOrderID:  buys[i].OrderID,
				SellOrderID: req.OrderID,
				StockSymbol: symbol,
				Quantity:    matchQty,
				Price:       buys[i].Price,
			}
			database.DB.Create(&match)
			matches = append(matches, match)

			buys[i].Remaining -= matchQty
			if buys[i].Remaining <= 0 {
				buys[i].Status = models.MatchMatched
			} else {
				buys[i].Status = models.MatchPartial
			}
			database.DB.Save(&buys[i])
			remaining -= matchQty
		}
	}

	// Update incoming order status
	entry.Remaining = remaining
	if remaining <= 0 {
		entry.Status = models.MatchMatched
	} else if remaining < req.Quantity {
		entry.Status = models.MatchPartial
	}
	database.DB.Save(&entry)

	// Dispatch matched trades to Trade Executor
	for _, m := range matches {
		go dispatchToTradeExecutor(m)
	}

	c.JSON(http.StatusOK, gin.H{
		"order_id":   req.OrderID,
		"matches":    len(matches),
		"remaining":  remaining,
		"status":     string(entry.Status),
	})
}

// GetBook returns the current order book for a symbol
func GetBook(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))

	var bids []models.OrderEntry
	var asks []models.OrderEntry
	database.DB.Where("stock_symbol = ? AND side = ? AND status IN ?", symbol, "BUY",
		[]string{string(models.MatchPending), string(models.MatchPartial)}).
		Order("price DESC").Find(&bids)
	database.DB.Where("stock_symbol = ? AND side = ? AND status IN ?", symbol, "SELL",
		[]string{string(models.MatchPending), string(models.MatchPartial)}).
		Order("price ASC").Find(&asks)

	c.JSON(http.StatusOK, gin.H{"symbol": symbol, "bids": bids, "asks": asks})
}

// GetMatches returns match history
func GetMatches(c *gin.Context) {
	var matches []models.MatchResult
	query := database.DB
	if s := c.Query("symbol"); s != "" {
		query = query.Where("stock_symbol = ?", strings.ToUpper(s))
	}
	query.Order("matched_at DESC").Limit(100).Find(&matches)
	c.JSON(http.StatusOK, gin.H{"matches": matches, "total": len(matches)})
}

func dispatchToTradeExecutor(m models.MatchResult) {
	body, _ := json.Marshal(map[string]interface{}{
		"match_id":      m.ID,
		"buy_order_id":  m.BuyOrderID,
		"sell_order_id": m.SellOrderID,
		"stock_symbol":  m.StockSymbol,
		"quantity":      m.Quantity,
		"price":         m.Price,
	})
	resp, err := http.Post(cfg.TradeExecutorURL+"/execute", "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("⚠️ Trade Executor unreachable: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("✅ Dispatched match %s to Trade Executor: %d", m.ID, resp.StatusCode)
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func init() {
	_ = fmt.Sprintf // keep fmt imported
}
