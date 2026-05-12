package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"open_soft_3/config"
	"open_soft_3/internal/services"
	"open_soft_3/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService   *services.AuthService
	loginLimiter  *utils.AttemptLimiter
	verifyLimiter *utils.AttemptLimiter
}

func NewAuthHandler(cfg *config.Config, authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService:   authService,
		loginLimiter:  utils.NewAttemptLimiter(cfg.LoginMaxAttemptsPer15Minute, 15*time.Minute),
		verifyLimiter: utils.NewAttemptLimiter(cfg.OTPMaxVerificationAttempts*3, 10*time.Minute),
	}
}

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type verifyOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required,len=6,numeric"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type resendOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.WriteError(c, http.StatusBadRequest, "invalid_request", fmt.Sprintf("Invalid request body: %v", err))
		return
	}

	if err := h.authService.Register(c.Request.Context(), req.Email, req.Password); err != nil {
		utils.WriteErrorFromErr(c, err)
		return
	}

	utils.WriteSuccess(c, http.StatusCreated, gin.H{
		"message": "Registration successful. OTP sent to email",
	})
}

func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req verifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.WriteError(c, http.StatusBadRequest, "invalid_request", fmt.Sprintf("Invalid request body: %v", err))
		return
	}

	key := fmt.Sprintf("%s|%s", strings.ToLower(strings.TrimSpace(req.Email)), c.ClientIP())
	if allowed, retryAfter := h.verifyLimiter.Allow(key); !allowed {
		utils.WriteError(c, http.StatusTooManyRequests, "too_many_attempts", fmt.Sprintf("Too many attempts. Retry in %d seconds", int(retryAfter.Seconds())+1))
		return
	}

	if err := h.authService.VerifyOTP(c.Request.Context(), req.Email, req.OTP); err != nil {
		utils.WriteErrorFromErr(c, err)
		return
	}

	utils.WriteSuccess(c, http.StatusOK, gin.H{
		"message": "OTP verified successfully",
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.WriteError(c, http.StatusBadRequest, "invalid_request", fmt.Sprintf("Invalid request body: %v", err))
		return
	}

	key := fmt.Sprintf("%s|%s", strings.ToLower(strings.TrimSpace(req.Email)), c.ClientIP())
	if allowed, retryAfter := h.loginLimiter.Allow(key); !allowed {
		utils.WriteError(c, http.StatusTooManyRequests, "too_many_attempts", fmt.Sprintf("Too many login attempts. Retry in %d seconds", int(retryAfter.Seconds())+1))
		return
	}

	result, err := h.authService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		utils.WriteErrorFromErr(c, err)
		return
	}

	utils.WriteSuccess(c, http.StatusOK, result)
}

func (h *AuthHandler) ResendOTP(c *gin.Context) {
	var req resendOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.WriteError(c, http.StatusBadRequest, "invalid_request", fmt.Sprintf("Invalid request body: %v", err))
		return
	}

	if err := h.authService.ResendOTP(c.Request.Context(), req.Email); err != nil {
		utils.WriteErrorFromErr(c, err)
		return
	}

	utils.WriteSuccess(c, http.StatusOK, gin.H{
		"message": "If the account exists and is not verified, OTP has been sent",
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.WriteError(c, http.StatusBadRequest, "invalid_request", fmt.Sprintf("Invalid request body: %v", err))
		return
	}

	result, err := h.authService.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.WriteErrorFromErr(c, err)
		return
	}
	utils.WriteSuccess(c, http.StatusOK, result)
}

func (h *AuthHandler) Me(c *gin.Context) {
	emailValue, exists := c.Get("email")
	if !exists {
		utils.WriteError(c, http.StatusUnauthorized, "unauthorized", "Unauthorized")
		return
	}

	email, ok := emailValue.(string)
	if !ok || email == "" {
		utils.WriteError(c, http.StatusUnauthorized, "unauthorized", "Unauthorized")
		return
	}

	user, err := h.authService.GetUserProfile(c.Request.Context(), email)
	if err != nil {
		utils.WriteErrorFromErr(c, err)
		return
	}

	utils.WriteSuccess(c, http.StatusOK, gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"is_verified": user.IsVerified,
		"created_at":  user.CreatedAt,
		"updated_at":  user.UpdatedAt,
	})
}
