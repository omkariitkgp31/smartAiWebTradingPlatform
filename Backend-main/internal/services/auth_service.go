package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"open_soft_3/config"
	"open_soft_3/internal/models"
	"open_soft_3/internal/repository"
	"open_soft_3/internal/utils"

	"github.com/google/uuid"
)

type LoginResult struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	TokenType        string `json:"token_type"`
	ExpiresInSeconds int64  `json:"expires_in_seconds"`
}

type AuthService struct {
	cfg               *config.Config
	repo              *repository.AuthRepository
	emailer           EmailSender
	tokens            *utils.TokenManager
	logger            *slog.Logger
	otpRequestLimiter *utils.AttemptLimiter
}

func NewAuthService(
	cfg *config.Config,
	repo *repository.AuthRepository,
	emailer EmailSender,
	tokens *utils.TokenManager,
	logger *slog.Logger,
) *AuthService {
	return &AuthService{
		cfg:               cfg,
		repo:              repo,
		emailer:           emailer,
		tokens:            tokens,
		logger:            logger,
		otpRequestLimiter: utils.NewAttemptLimiter(cfg.OTPMaxRequestsPerHour, time.Hour),
	}
}

func (s *AuthService) Register(ctx context.Context, email, password string) error {
	normalizedEmail := utils.NormalizeEmail(email)
	if err := utils.ValidateEmail(normalizedEmail); err != nil {
		return utils.NewAppError(400, "invalid_email", "Invalid email format", err)
	}
	if err := utils.ValidatePasswordPolicy(password); err != nil {
		return utils.NewAppError(400, "invalid_password", err.Error(), err)
	}

	existingUser, err := s.repo.GetUserByEmail(ctx, normalizedEmail)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return utils.NewAppError(500, "db_error", "Failed to check user", err)
	}
	if existingUser != nil && existingUser.IsVerified {
		return utils.NewAppError(409, "email_already_registered", "Email is already registered and verified", nil)
	}

	if err := s.ensureOTPRequestAllowed(ctx, normalizedEmail); err != nil {
		return err
	}

	passwordHash, err := utils.HashPassword(password)
	if err != nil {
		return utils.NewAppError(500, "password_hash_error", "Failed to secure password", err)
	}

	if existingUser == nil {
		user := &models.User{
			Email:        normalizedEmail,
			PasswordHash: passwordHash,
			IsVerified:   true, // Bypassing OTP verification for now
		}
		if err := s.repo.CreateUser(ctx, user); err != nil {
			return utils.NewAppError(500, "db_error", "Failed to create user", err)
		}
	} else {
		if err := s.repo.UpdateUserPassword(ctx, normalizedEmail, passwordHash); err != nil {
			return utils.NewAppError(500, "db_error", "Failed to update user", err)
		}
		if err := s.repo.SetUserVerified(ctx, normalizedEmail, true); err != nil {
			return utils.NewAppError(500, "db_error", "Failed to verify existing user", err)
		}
	}

	if err := s.issueAndSendOTP(ctx, normalizedEmail); err != nil {
		return err
	}

	return nil
}

func (s *AuthService) ResendOTP(ctx context.Context, email string) error {
	normalizedEmail := utils.NormalizeEmail(email)
	if err := utils.ValidateEmail(normalizedEmail); err != nil {
		return utils.NewAppError(400, "invalid_email", "Invalid email format", err)
	}

	user, err := s.repo.GetUserByEmail(ctx, normalizedEmail)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil
		}
		return utils.NewAppError(500, "db_error", "Failed to check user", err)
	}
	if user.IsVerified {
		return utils.NewAppError(409, "already_verified", "Account is already verified", nil)
	}

	if err := s.ensureOTPRequestAllowed(ctx, normalizedEmail); err != nil {
		return err
	}

	return s.issueAndSendOTP(ctx, normalizedEmail)
}

func (s *AuthService) VerifyOTP(ctx context.Context, email, otp string) error {
	normalizedEmail := utils.NormalizeEmail(email)
	otp = strings.TrimSpace(otp)

	if err := utils.ValidateEmail(normalizedEmail); err != nil {
		return utils.NewAppError(400, "invalid_email", "Invalid email format", err)
	}
	if len(otp) != 6 {
		return utils.NewAppError(400, "invalid_otp_format", "OTP must be 6 digits", nil)
	}

	_, err := s.repo.GetUserByEmail(ctx, normalizedEmail)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.NewAppError(401, "invalid_credentials", "Invalid email or OTP", nil)
		}
		return utils.NewAppError(500, "db_error", "Failed to check user", err)
	}

	activeOTP, err := s.repo.GetLatestActiveOTPByEmail(ctx, normalizedEmail, time.Now().UTC())
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return utils.NewAppError(401, "invalid_or_expired_otp", "OTP is invalid or expired", nil)
		}
		return utils.NewAppError(500, "db_error", "Failed to validate OTP", err)
	}

	if activeOTP.Attempts >= s.cfg.OTPMaxVerificationAttempts {
		_ = s.repo.DeleteOTPByID(ctx, activeOTP.ID)
		return utils.NewAppError(429, "otp_attempts_exceeded", "OTP attempts exceeded. Request a new OTP", nil)
	}

	if !utils.CompareOTPHash(activeOTP.OTPHash, otp, s.cfg.OTPHashPepper) {
		_ = s.repo.IncrementOTPAttempts(ctx, activeOTP.ID)
		if activeOTP.Attempts+1 >= s.cfg.OTPMaxVerificationAttempts {
			_ = s.repo.DeleteOTPByID(ctx, activeOTP.ID)
		}
		return utils.NewAppError(401, "invalid_or_expired_otp", "OTP is invalid or expired", nil)
	}

	if err := s.repo.SetUserVerified(ctx, normalizedEmail, true); err != nil {
		return utils.NewAppError(500, "db_error", "Failed to verify user", err)
	}

	if err := s.repo.DeleteOTPByID(ctx, activeOTP.ID); err != nil {
		s.logger.Warn("failed to delete used otp", "email", normalizedEmail, "error", err)
	}

	return nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	normalizedEmail := utils.NormalizeEmail(email)
	if err := utils.ValidateEmail(normalizedEmail); err != nil {
		return nil, utils.NewAppError(400, "invalid_email", "Invalid email format", err)
	}

	user, err := s.repo.GetUserByEmail(ctx, normalizedEmail)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, utils.NewAppError(401, "invalid_credentials", "Invalid email or password", nil)
		}
		return nil, utils.NewAppError(500, "db_error", "Failed to login", err)
	}

	if !user.IsVerified {
		return nil, utils.NewAppError(403, "account_not_verified", "Please verify your account before login", nil)
	}

	if !utils.CheckPassword(password, user.PasswordHash) {
		return nil, utils.NewAppError(401, "invalid_credentials", "Invalid email or password", nil)
	}

	accessToken, err := s.tokens.GenerateAccessToken(user)
	if err != nil {
		return nil, utils.NewAppError(500, "token_error", "Failed to generate access token", err)
	}

	refreshToken, err := s.tokens.GenerateRefreshToken(user)
	if err != nil {
		return nil, utils.NewAppError(500, "token_error", "Failed to generate refresh token", err)
	}

	return &LoginResult{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		TokenType:        "Bearer",
		ExpiresInSeconds: int64(time.Duration(s.cfg.AccessTokenMinutes) * time.Minute / time.Second),
	}, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*LoginResult, error) {
	claims, err := s.tokens.ValidateToken(strings.TrimSpace(refreshToken), utils.TokenTypeRefresh)
	if err != nil {
		return nil, utils.NewAppError(401, "invalid_refresh_token", "Refresh token is invalid or expired", err)
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, utils.NewAppError(401, "invalid_refresh_token", "Refresh token is invalid", err)
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, utils.NewAppError(401, "invalid_refresh_token", "Refresh token user no longer exists", nil)
		}
		return nil, utils.NewAppError(500, "db_error", "Failed to refresh token", err)
	}
	if !user.IsVerified {
		return nil, utils.NewAppError(403, "account_not_verified", "Account is not verified", nil)
	}

	newAccessToken, err := s.tokens.GenerateAccessToken(user)
	if err != nil {
		return nil, utils.NewAppError(500, "token_error", "Failed to generate access token", err)
	}
	newRefreshToken, err := s.tokens.GenerateRefreshToken(user)
	if err != nil {
		return nil, utils.NewAppError(500, "token_error", "Failed to generate refresh token", err)
	}

	return &LoginResult{
		AccessToken:      newAccessToken,
		RefreshToken:     newRefreshToken,
		TokenType:        "Bearer",
		ExpiresInSeconds: int64(time.Duration(s.cfg.AccessTokenMinutes) * time.Minute / time.Second),
	}, nil
}

func (s *AuthService) GetUserProfile(ctx context.Context, email string) (*models.User, error) {
	normalizedEmail := utils.NormalizeEmail(email)
	user, err := s.repo.GetUserByEmail(ctx, normalizedEmail)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, utils.NewAppError(404, "user_not_found", "User not found", nil)
		}
		return nil, utils.NewAppError(500, "db_error", "Failed to fetch user", err)
	}
	return user, nil
}

func (s *AuthService) ensureOTPRequestAllowed(ctx context.Context, email string) error {
	now := time.Now().UTC()

	allowed, retryAfter := s.otpRequestLimiter.Allow(email)
	if !allowed {
		return utils.NewAppError(
			429,
			"otp_rate_limited",
			fmt.Sprintf("OTP request limit reached. Retry in %d seconds", int(retryAfter.Seconds())+1),
			nil,
		)
	}
	lastOTP, err := s.repo.GetMostRecentOTPByEmail(ctx, email)
	if err != nil && !errors.Is(err, repository.ErrNotFound) {
		return utils.NewAppError(500, "db_error", "Failed to check OTP cooldown", err)
	}
	if lastOTP != nil {
		cooldown := time.Duration(s.cfg.OTPResendCooldownSeconds) * time.Second
		elapsed := now.Sub(lastOTP.CreatedAt)
		if elapsed < cooldown {
			wait := cooldown - elapsed
			return utils.NewAppError(
				429,
				"otp_cooldown",
				fmt.Sprintf("Please wait %d seconds before requesting another OTP", int(wait.Seconds())+1),
				nil,
			)
		}
	}

	return nil
}

func (s *AuthService) issueAndSendOTP(ctx context.Context, email string) error {
	otp, err := utils.GenerateNumericOTP(6)
	if err != nil {
		return utils.NewAppError(500, "otp_generation_error", "Failed to generate OTP", err)
	}

	otpHash := utils.HashOTP(otp, s.cfg.OTPHashPepper)
	expiresAt := time.Now().UTC().Add(time.Duration(s.cfg.OTPExpiryMinutes) * time.Minute)

	if err := s.repo.ExpireActiveOTPsByEmail(ctx, email, time.Now().UTC()); err != nil {
		return utils.NewAppError(500, "db_error", "Failed to prepare OTP", err)
	}

	if err := s.repo.CreateOTP(ctx, &models.OTP{
		Email:     email,
		OTPHash:   otpHash,
		ExpiresAt: expiresAt,
	}); err != nil {
		return utils.NewAppError(500, "db_error", "Failed to store OTP", err)
	}

	if err := s.emailer.SendOTP(ctx, email, otp, time.Duration(s.cfg.OTPExpiryMinutes)*time.Minute); err != nil {
		s.logger.Error("failed to send otp email", "email", email, "error", err)
		return utils.NewAppError(500, "email_error", "Failed to send OTP email", err)
	}

	return nil
}
