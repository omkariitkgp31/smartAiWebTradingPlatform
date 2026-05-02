package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/stockbroker/notification-service/database"
	"github.com/stockbroker/notification-service/models"
)

type NotifyReq struct {
	UserID  string `json:"user_id" binding:"required"`
	Title   string `json:"title" binding:"required"`
	Message string `json:"message" binding:"required"`
	OrderID string `json:"order_id"`
}

// Notify receives a notification event from Queue Processor
func Notify(c *gin.Context) {
	var req NotifyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	notif := models.Notification{
		UserID:  req.UserID,
		Title:   req.Title,
		Message: req.Message,
		OrderID: req.OrderID,
	}
	database.DB.Create(&notif)
	log.Printf("🔔 Notification for user %s: %s", req.UserID, req.Title)

	c.JSON(http.StatusCreated, gin.H{"message": "Notification sent", "id": notif.ID})
}

// GetNotifications returns all notifications for a user
func GetNotifications(c *gin.Context) {
	userID := c.Param("user_id")
	var notifs []models.Notification
	database.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&notifs)

	unread := 0
	for _, n := range notifs {
		if !n.IsRead {
			unread++
		}
	}
	c.JSON(http.StatusOK, gin.H{"notifications": notifs, "total": len(notifs), "unread": unread})
}

// MarkRead marks a notification as read
func MarkRead(c *gin.Context) {
	id := c.Param("id")
	result := database.DB.Model(&models.Notification{}).Where("id = ?", id).Update("is_read", true)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

// MarkAllRead marks all notifications for a user as read
func MarkAllRead(c *gin.Context) {
	userID := c.Param("user_id")
	database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}
