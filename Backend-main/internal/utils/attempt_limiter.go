package utils

import (
	"sync"
	"time"
)

type attemptEntry struct {
	Count       int
	WindowStart time.Time
}

type AttemptLimiter struct {
	mu      sync.Mutex
	entries map[string]*attemptEntry
	limit   int
	window  time.Duration

	lastCleanup     time.Time
	cleanupInterval time.Duration
}

func NewAttemptLimiter(limit int, window time.Duration) *AttemptLimiter {
	return &AttemptLimiter{
		entries:         make(map[string]*attemptEntry),
		limit:           limit,
		window:          window,
		lastCleanup:     time.Now().UTC(),
		cleanupInterval: 5 * time.Minute,
	}
}

func (l *AttemptLimiter) Allow(key string) (bool, time.Duration) {
	now := time.Now().UTC()

	l.mu.Lock()
	defer l.mu.Unlock()

	if now.Sub(l.lastCleanup) >= l.cleanupInterval {
		for k, v := range l.entries {
			if now.Sub(v.WindowStart) >= l.window {
				delete(l.entries, k)
			}
		}
		l.lastCleanup = now
	}

	entry, ok := l.entries[key]
	if !ok || now.Sub(entry.WindowStart) >= l.window {
		l.entries[key] = &attemptEntry{
			Count:       1,
			WindowStart: now,
		}
		return true, 0
	}

	if entry.Count >= l.limit {
		retryAfter := l.window - now.Sub(entry.WindowStart)
		if retryAfter < 0 {
			retryAfter = 0
		}
		return false, retryAfter
	}

	entry.Count++
	return true, 0
}
