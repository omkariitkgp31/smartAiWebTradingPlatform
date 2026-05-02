package utils

import (
	"fmt"
	"net/mail"
	"strings"
)

func NormalizeEmail(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

func ValidateEmail(raw string) error {
	addr, err := mail.ParseAddress(raw)
	if err != nil {
		return fmt.Errorf("invalid email format")
	}
	if NormalizeEmail(addr.Address) != NormalizeEmail(raw) {
		return fmt.Errorf("invalid email format")
	}
	return nil
}
