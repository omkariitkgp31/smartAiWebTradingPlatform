package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"open_soft_3/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrNotFound = errors.New("record not found")

type AuthRepository struct {
	db *gorm.DB
}

func NewAuthRepository(db *gorm.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).Take(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &user, nil
}

func (r *AuthRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("id = ?", id).Take(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &user, nil
}

func (r *AuthRepository) CreateUser(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *AuthRepository) UpdateUserPassword(ctx context.Context, email, passwordHash string) error {
	res := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("email = ?", email).
		Updates(map[string]any{"password_hash": passwordHash, "updated_at": time.Now().UTC()})
	if res.Error != nil {
		return fmt.Errorf("update user password: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AuthRepository) SetUserVerified(ctx context.Context, email string, verified bool) error {
	res := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("email = ?", email).
		Updates(map[string]any{"is_verified": verified, "updated_at": time.Now().UTC()})
	if res.Error != nil {
		return fmt.Errorf("set user verified: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AuthRepository) DeleteOTPsByEmail(ctx context.Context, email string) error {
	if err := r.db.WithContext(ctx).Where("email = ?", email).Delete(&models.OTP{}).Error; err != nil {
		return fmt.Errorf("delete otp by email: %w", err)
	}
	return nil
}

func (r *AuthRepository) ExpireActiveOTPsByEmail(ctx context.Context, email string, now time.Time) error {
	res := r.db.WithContext(ctx).
		Model(&models.OTP{}).
		Where("email = ? AND expires_at > ?", email, now).
		Update("expires_at", now)
	if res.Error != nil {
		return fmt.Errorf("expire active otp by email: %w", res.Error)
	}
	return nil
}

func (r *AuthRepository) CreateOTP(ctx context.Context, otp *models.OTP) error {
	if err := r.db.WithContext(ctx).Create(otp).Error; err != nil {
		return fmt.Errorf("create otp: %w", err)
	}
	return nil
}

func (r *AuthRepository) GetLatestActiveOTPByEmail(ctx context.Context, email string, now time.Time) (*models.OTP, error) {
	var otp models.OTP
	err := r.db.WithContext(ctx).
		Where("email = ? AND expires_at > ?", email, now).
		Order("created_at DESC").
		Take(&otp).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get latest active otp: %w", err)
	}
	return &otp, nil
}

func (r *AuthRepository) GetMostRecentOTPByEmail(ctx context.Context, email string) (*models.OTP, error) {
	var otp models.OTP
	err := r.db.WithContext(ctx).
		Where("email = ?", email).
		Order("created_at DESC").
		Take(&otp).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get most recent otp: %w", err)
	}
	return &otp, nil
}

func (r *AuthRepository) CountOTPsByEmailSince(ctx context.Context, email string, since time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.OTP{}).
		Where("email = ? AND created_at >= ?", email, since).
		Count(&count).Error
	if err != nil {
		return 0, fmt.Errorf("count otps: %w", err)
	}
	return count, nil
}

func (r *AuthRepository) IncrementOTPAttempts(ctx context.Context, otpID uuid.UUID) error {
	res := r.db.WithContext(ctx).
		Model(&models.OTP{}).
		Where("id = ?", otpID).
		UpdateColumn("attempts", gorm.Expr("attempts + ?", 1))
	if res.Error != nil {
		return fmt.Errorf("increment otp attempts: %w", res.Error)
	}
	return nil
}

func (r *AuthRepository) DeleteOTPByID(ctx context.Context, otpID uuid.UUID) error {
	if err := r.db.WithContext(ctx).Where("id = ?", otpID).Delete(&models.OTP{}).Error; err != nil {
		return fmt.Errorf("delete otp by id: %w", err)
	}
	return nil
}

func (r *AuthRepository) DeleteExpiredOTPs(ctx context.Context, now time.Time) (int64, error) {
	res := r.db.WithContext(ctx).Where("expires_at <= ?", now).Delete(&models.OTP{})
	if res.Error != nil {
		return 0, fmt.Errorf("delete expired otps: %w", res.Error)
	}
	return res.RowsAffected, nil
}
