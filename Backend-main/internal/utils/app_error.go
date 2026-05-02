package utils

import "fmt"

type AppError struct {
	StatusCode int    `json:"-"`
	Code       string `json:"code"`
	Message    string `json:"message"`
	Err        error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err == nil {
		return fmt.Sprintf("%s: %s", e.Code, e.Message)
	}
	return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewAppError(status int, code, message string, err error) *AppError {
	return &AppError{
		StatusCode: status,
		Code:       code,
		Message:    message,
		Err:        err,
	}
}
