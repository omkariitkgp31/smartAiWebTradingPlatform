package services

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"open_soft_3/config"
)

type EmailSender interface {
	SendOTP(ctx context.Context, to, otp string, expiresIn time.Duration) error
}

type SMTPEmailService struct {
	cfg    *config.Config
	logger *slog.Logger
}

func NewSMTPEmailService(cfg *config.Config, logger *slog.Logger) *SMTPEmailService {
	return &SMTPEmailService{
		cfg:    cfg,
		logger: logger,
	}
}

func (s *SMTPEmailService) SendOTP(ctx context.Context, to, otp string, expiresIn time.Duration) error {
	parsedTo, err := mail.ParseAddress(strings.TrimSpace(to))
	if err != nil {
		return fmt.Errorf("invalid email address")
	}

	if s.cfg.SMTPMock {
		s.logger.Info("mock otp email sent",
			"to", parsedTo.Address,
			"otp", otp,
			"expires_in_minutes", int(expiresIn.Minutes()),
		)
		return nil
	}

	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	subject := "Your verification OTP"
	body := buildOTPEmailText(otp, int(expiresIn.Minutes()))

	msg := strings.Builder{}
	msg.WriteString(fmt.Sprintf("From: %s\r\n", s.cfg.SMTPFrom))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", parsedTo.Address))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(body)

	addr := net.JoinHostPort(s.cfg.SMTPHost, s.cfg.SMTPPort)
	auth := smtp.PlainAuth("", s.cfg.SMTPUsername, s.cfg.SMTPPassword, s.cfg.SMTPHost)

	if err := smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{parsedTo.Address}, []byte(msg.String())); err != nil {
		return fmt.Errorf("send smtp mail: %w", err)
	}
	return nil
}

func buildOTPEmailText(otp string, expiryMinutes int) string {
	return fmt.Sprintf(
		"Hello,\n\nYour one-time verification code is: %s\n\nThis code will expire in %d minutes.\nIf you did not request this, please ignore this email.\n\nRegards,\nAuth Service\n",
		otp,
		expiryMinutes,
	)
}
