package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"open_soft_3/config"
	"open_soft_3/internal/handlers"
	"open_soft_3/internal/jobs"
	"open_soft_3/internal/repository"
	"open_soft_3/internal/router"
	"open_soft_3/internal/services"
	"open_soft_3/internal/utils"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("load config failed", "error", err)
		os.Exit(1)
	}

	db, err := repository.NewDatabase(cfg)
	if err != nil {
		logger.Error("database initialization failed", "error", err)
		os.Exit(1)
	}

	if err := repository.AutoMigrate(db); err != nil {
		logger.Error("database migration failed", "error", err)
		os.Exit(1)
	}

	sqlDB, err := db.DB()
	if err != nil {
		logger.Error("database handle failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		_ = sqlDB.Close()
	}()

	authRepo := repository.NewAuthRepository(db)
	emailer := services.NewSMTPEmailService(cfg, logger)
	tokenManager := utils.NewTokenManager(
		cfg.JWTSecret,
		cfg.JWTIssuer,
		time.Duration(cfg.AccessTokenMinutes)*time.Minute,
		time.Duration(cfg.RefreshTokenHours)*time.Hour,
	)
	authService := services.NewAuthService(cfg, authRepo, emailer, tokenManager, logger)
	authHandler := handlers.NewAuthHandler(cfg, authService)

	engine := router.New(cfg, authHandler, tokenManager, logger)

	server := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      engine,
		ReadTimeout:  time.Duration(cfg.ServerReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.ServerWriteTimeout) * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	cleanupCtx, cleanupCancel := context.WithCancel(context.Background())
	defer cleanupCancel()
	cleanupJob := jobs.NewOTPCleanupJob(
		authRepo,
		time.Duration(cfg.CleanupIntervalMinutes)*time.Minute,
		logger,
	)
	go cleanupJob.Start(cleanupCtx)

	go func() {
		logger.Info("server started", "port", cfg.ServerPort, "env", cfg.AppEnv)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stopCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	<-stopCtx.Done()
	logger.Info("shutdown signal received")
	cleanupCancel()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
	logger.Info("server stopped")
}
