package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/stockbroker/identity-service/auth"
	"github.com/stockbroker/identity-service/database"
	"github.com/stockbroker/identity-service/models"
)

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=100"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

// Register creates a new user
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check email uniqueness
	var existing models.User
	if database.DB.Where("email = ?", req.Email).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already registered"})
		return
	}
	if database.DB.Where("username = ?", req.Username).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already taken"})
		return
	}

	hashedPw, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		Email:          req.Email,
		Username:       req.Username,
		HashedPassword: hashedPw,
		FullName:       req.FullName,
	}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

// Login validates credentials and returns JWT tokens
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !auth.CheckPassword(req.Password, user.HashedPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "User account is deactivated"})
		return
	}

	accessToken, _ := auth.CreateAccessToken(user.ID)
	refreshToken, _ := auth.CreateRefreshToken(user.ID)

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "bearer",
		ExpiresIn:    1800,
	})
}

// Refresh issues new tokens from a valid refresh token
func Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	claims, err := auth.ValidateToken(req.RefreshToken)
	if err != nil || claims.Type != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", claims.Subject).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	accessToken, _ := auth.CreateAccessToken(user.ID)
	refreshToken, _ := auth.CreateRefreshToken(user.ID)

	c.JSON(http.StatusOK, TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "bearer",
		ExpiresIn:    1800,
	})
}

// GetProfile returns the current authenticated user
func GetProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateProfile updates the current user's profile
func UpdateProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var body struct {
		FullName string `json:"full_name"`
	}
	if err := c.ShouldBindJSON(&body); err == nil && body.FullName != "" {
		user.FullName = body.FullName
		database.DB.Save(&user)
	}

	c.JSON(http.StatusOK, user)
}
