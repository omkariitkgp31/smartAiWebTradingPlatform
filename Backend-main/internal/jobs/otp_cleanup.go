package jobs

import (
	"context"
	"log/slog"
	"time"

	"open_soft_3/internal/repository"
)

type OTPCleanupJob struct {
	repo     *repository.AuthRepository
	interval time.Duration
	logger   *slog.Logger
}

func NewOTPCleanupJob(repo *repository.AuthRepository, interval time.Duration, logger *slog.Logger) *OTPCleanupJob {
	return &OTPCleanupJob{
		repo:     repo,
		interval: interval,
		logger:   logger,
	}
}

func (j *OTPCleanupJob) Start(ctx context.Context) {
	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			j.logger.Info("otp cleanup job stopped")
			return
		case <-ticker.C:
			rows, err := j.repo.DeleteExpiredOTPs(ctx, time.Now().UTC())
			if err != nil {
				j.logger.Error("otp cleanup failed", "error", err)
				continue
			}
			if rows > 0 {
				j.logger.Info("expired otp records cleaned", "deleted_count", rows)
			}
		}
	}
}
