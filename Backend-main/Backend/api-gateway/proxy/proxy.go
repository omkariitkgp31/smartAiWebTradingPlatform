package proxy

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Forward proxies the incoming request to the target base URL, preserving
// method, headers, body, and query parameters.
func Forward(targetBaseURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Build target URL
		path := c.Param("path")
		if len(path) > 0 && path[0] == '/' {
			path = path[1:]
		}
		targetURL := targetBaseURL + "/" + path
		if q := c.Request.URL.RawQuery; q != "" {
			targetURL += "?" + q
		}

		// Create outbound request
		req, err := http.NewRequestWithContext(
			c.Request.Context(),
			c.Request.Method,
			targetURL,
			c.Request.Body,
		)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "failed to create proxy request"})
			return
		}

		// Copy headers (skip hop-by-hop)
		for key, values := range c.Request.Header {
			if key == "Host" || key == "Content-Length" || key == "Transfer-Encoding" {
				continue
			}
			for _, v := range values {
				req.Header.Add(key, v)
			}
		}

		// Execute
		client := &http.Client{Timeout: 30 * 1e9} // 30s
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "downstream service unreachable", "detail": err.Error()})
			return
		}
		defer resp.Body.Close()

		// Copy response headers
		for key, values := range resp.Header {
			for _, v := range values {
				c.Header(key, v)
			}
		}

		// Stream response body
		c.Status(resp.StatusCode)
		io.Copy(c.Writer, resp.Body)
	}
}
