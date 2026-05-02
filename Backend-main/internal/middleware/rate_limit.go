package middleware

import (
	"net/http"
	"sync"
	"time"

	"open_soft_3/internal/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type IPRateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	limit    rate.Limit
	burst    int
	ttl      time.Duration
}

func NewIPRateLimiter(limit rate.Limit, burst int, ttl time.Duration) *IPRateLimiter {
	rl := &IPRateLimiter{
		visitors: make(map[string]*visitor),
		limit:    limit,
		burst:    burst,
		ttl:      ttl,
	}
	go rl.cleanupVisitors()
	return rl
}

func (rl *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.limit, rl.burst)
		rl.visitors[ip] = &visitor{
			limiter:  limiter,
			lastSeen: time.Now().UTC(),
		}
		return limiter
	}

	v.lastSeen = time.Now().UTC()
	return v.limiter
}

func (rl *IPRateLimiter) cleanupVisitors() {
	ticker := time.NewTicker(2 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > rl.ttl {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *IPRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.getLimiter(ip).Allow() {
			utils.WriteError(c, http.StatusTooManyRequests, "too_many_requests", "Rate limit exceeded")
			c.Abort()
			return
		}
		c.Next()
	}
}
