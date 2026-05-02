package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/stockbroker/portfolio-service/database"
	"github.com/stockbroker/portfolio-service/models"
)

type UpdatePortfolioRequest struct {
	OrderID         string  `json:"order_id" binding:"required"`
	UserID          string  `json:"user_id" binding:"required"`
	StockSymbol     string  `json:"stock_symbol" binding:"required"`
	TransactionType string  `json:"transaction_type" binding:"required"`
	Quantity        float64 `json:"quantity" binding:"required,gt=0"`
	Price           float64 `json:"price" binding:"required,gt=0"`
}

// GetPortfolio returns all holdings for the authenticated user
func GetPortfolio(c *gin.Context) {
	userID := c.GetString("user_id")
	var holdings []models.Holding
	database.DB.Where("user_id = ? AND quantity > 0", userID).Find(&holdings)

	totalInvested := 0.0
	for _, h := range holdings {
		totalInvested += h.TotalInvested
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":        userID,
		"holdings":       holdings,
		"total_invested": totalInvested,
		"total_holdings": len(holdings),
	})
}

// GetHolding returns a single holding by stock symbol
func GetHolding(c *gin.Context) {
	userID := c.GetString("user_id")
	symbol := strings.ToUpper(c.Param("symbol"))

	var holding models.Holding
	if err := database.DB.Where("user_id = ? AND stock_symbol = ?", userID, symbol).First(&holding).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No holding found for " + symbol})
		return
	}
	c.JSON(http.StatusOK, holding)
}

// UpdatePortfolio receives "Update Portfolio" from Queue Processor
func UpdatePortfolio(c *gin.Context) {
	var req UpdatePortfolioRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	symbol := strings.ToUpper(req.StockSymbol)
	totalAmount := req.Quantity * req.Price

	var holding models.Holding
	found := database.DB.Where("user_id = ? AND stock_symbol = ?", req.UserID, symbol).First(&holding).Error == nil

	if req.TransactionType == "BUY" {
		if found {
			newQty := holding.Quantity + req.Quantity
			holding.TotalInvested += totalAmount
			holding.AverageBuyPrice = holding.TotalInvested / newQty
			holding.Quantity = newQty
			database.DB.Save(&holding)
		} else {
			holding = models.Holding{
				UserID:          req.UserID,
				StockSymbol:     symbol,
				Quantity:        req.Quantity,
				AverageBuyPrice: req.Price,
				TotalInvested:   totalAmount,
			}
			database.DB.Create(&holding)
		}
	} else if req.TransactionType == "SELL" {
		if !found || holding.Quantity < req.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient holdings to sell"})
			return
		}
		holding.Quantity -= req.Quantity
		holding.TotalInvested -= req.Quantity * holding.AverageBuyPrice
		database.DB.Save(&holding)
	}

	// Record transaction
	txn := models.Transaction{
		UserID:          req.UserID,
		OrderID:         req.OrderID,
		StockSymbol:     symbol,
		TransactionType: models.TransactionType(req.TransactionType),
		Quantity:        req.Quantity,
		Price:           req.Price,
		TotalAmount:     totalAmount,
	}
	database.DB.Create(&txn)

	c.JSON(http.StatusOK, gin.H{"message": "Portfolio updated"})
}

// GetTransactions returns transaction history
func GetTransactions(c *gin.Context) {
	userID := c.GetString("user_id")
	var txns []models.Transaction

	query := database.DB.Where("user_id = ?", userID)
	if s := c.Query("stock_symbol"); s != "" {
		query = query.Where("stock_symbol = ?", strings.ToUpper(s))
	}
	if t := c.Query("transaction_type"); t != "" {
		query = query.Where("transaction_type = ?", t)
	}
	query.Order("created_at DESC").Find(&txns)

	c.JSON(http.StatusOK, gin.H{"transactions": txns, "total": len(txns)})
}
