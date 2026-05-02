package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"math/big"
)

func GenerateNumericOTP(length int) (string, error) {
	if length <= 0 {
		return "", fmt.Errorf("invalid otp length")
	}

	otp := make([]byte, length)
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", fmt.Errorf("generate otp: %w", err)
		}
		otp[i] = byte('0' + n.Int64())
	}
	return string(otp), nil
}

func HashOTP(otp, pepper string) string {
	sum := sha256.Sum256([]byte(otp + ":" + pepper))
	return hex.EncodeToString(sum[:])
}

func CompareOTPHash(storedHash, rawOTP, pepper string) bool {
	computed := HashOTP(rawOTP, pepper)
	return subtle.ConstantTimeCompare([]byte(storedHash), []byte(computed)) == 1
}
