package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/stockbroker/order-service/database"
	"github.com/stockbroker/order-service/dispatcher"
	"github.com/stockbroker/order-service/models"
)

type OrderRequest struct {
	StockSymbol string  `json:"stock_symbol" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	Price       float64 `json:"price" binding:"required,gt=0"`
}

// PlaceBuyOrder handles POST /buy
func PlaceBuyOrder(c *gin.Context) {
	placeOrder(c, models.OrderTypeBuy)
}

// PlaceSellOrder handles POST /sell
func PlaceSellOrder(c *gin.Context) {
	placeOrder(c, models.OrderTypeSell)
}

func placeOrder(c *gin.Context, orderType models.OrderType) {
	var req OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	order := models.Order{
		UserID:      userID,
		StockSymbol: strings.ToUpper(req.StockSymbol),
		OrderType:   orderType,
		Quantity:    req.Quantity,
		Price:       req.Price,
		Status:      models.StatusPlaced,
	}
	if err := database.DB.Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Dispatch to Queue Processor
	dispatcher.DispatchToQueue(dispatcher.OrderEvent{
		OrderID:     order.ID,
		UserID:      order.UserID,
		StockSymbol: order.StockSymbol,
		OrderType:   string(order.OrderType),
		Quantity:    order.Quantity,
		Price:       order.Price,
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": string(orderType) + " order placed successfully",
		"order":   order,
	})
}

// ListOrders handles GET /
func ListOrders(c *gin.Context) {
	userID := c.GetString("user_id")
	var orders []models.Order

	query := database.DB.Where("user_id = ?", userID)
	if ot := c.Query("order_type"); ot != "" {
		query = query.Where("order_type = ?", ot)
	}
	if s := c.Query("status"); s != "" {
		query = query.Where("status = ?", s)
	}
	query.Order("created_at DESC").Find(&orders)

	c.JSON(http.StatusOK, gin.H{"orders": orders, "total": len(orders)})
}

// GetOrder handles GET /:id
func GetOrder(c *gin.Context) {
	userID := c.GetString("user_id")
	orderID := c.Param("id")
	var order models.Order
	if err := database.DB.Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

// CancelOrder handles DELETE /:id
func CancelOrder(c *gin.Context) {
	userID := c.GetString("user_id")
	orderID := c.Param("id")
	var order models.Order
	if err := database.DB.Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if order.Status != models.StatusPending && order.Status != models.StatusPlaced {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot cancel order with status " + string(order.Status)})
		return
	}
	order.Status = models.StatusCancelled
	database.DB.Save(&order)
	c.JSON(http.StatusOK, gin.H{"message": "Order cancelled"})
}
