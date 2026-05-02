package utils

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

func WriteSuccess(c *gin.Context, status int, payload any) {
	c.JSON(status, payload)
}

func WriteError(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{
		"error": gin.H{
			"code":    code,
			"message": message,
		},
	})
}

func WriteErrorFromErr(c *gin.Context, err error) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		WriteError(c, appErr.StatusCode, appErr.Code, appErr.Message)
		return
	}
	WriteError(c, http.StatusInternalServerError, "internal_error", "Internal server error")
}
