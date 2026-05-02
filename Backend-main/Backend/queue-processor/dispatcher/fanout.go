package dispatcher

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/stockbroker/queue-processor/config"
)

type DispatchResult struct {
	Target     string `json:"target"`
	Success    bool   `json:"success"`
	StatusCode int    `json:"status_code,omitempty"`
	Error      string `json:"error,omitempty"`
}

type target struct {
	Name    string
	URL     string
	Payload interface{}
}

var cfg *config.Config

func Init(c *config.Config) { cfg = c }

// FanOut dispatches the order event to all 5 downstream targets in parallel
// using goroutines and sync.WaitGroup.
func FanOut(orderData map[string]interface{}) []DispatchResult {
	targets := []target{
		{
			Name:    "Order Matcher",
			URL:     cfg.OrderMatcherURL + "/match",
			Payload: orderData,
		},
		{
			Name:    "Market",
			URL:     cfg.MarketTopicURL + "/publish",
			Payload: orderData,
		},
		{
			Name: "Notification / Alert",
			URL:  cfg.NotificationURL + "/notify",
			Payload: map[string]interface{}{
				"user_id":  orderData["user_id"],
				"title":    fmt.Sprintf("Order %s", orderData["order_type"]),
				"message":  fmt.Sprintf("%s %.0f shares of %s @ %.2f", orderData["order_type"], orderData["quantity"], orderData["stock_symbol"], orderData["price"]),
				"order_id": orderData["order_id"],
			},
		},
		{
			Name: "Portfolio Service",
			URL:  cfg.PortfolioServiceURL + "/update",
			Payload: map[string]interface{}{
				"order_id":         orderData["order_id"],
				"user_id":          orderData["user_id"],
				"stock_symbol":     orderData["stock_symbol"],
				"transaction_type": orderData["order_type"],
				"quantity":         orderData["quantity"],
				"price":            orderData["price"],
			},
		},
		{
			Name: "Price Update Service",
			URL:  cfg.PriceUpdateServiceURL + "/cdc",
			Payload: map[string]interface{}{
				"symbol": orderData["stock_symbol"],
				"price":  orderData["price"],
				"source": "queue_processor",
			},
		},
	}

	results := make([]DispatchResult, len(targets))
	var wg sync.WaitGroup

	for i, t := range targets {
		wg.Add(1)
		go func(idx int, tgt target) {
			defer wg.Done()
			results[idx] = dispatchOne(tgt)
		}(i, t)
	}

	wg.Wait()
	return results
}

func dispatchOne(t target) DispatchResult {
	body, _ := json.Marshal(t.Payload)
	resp, err := http.Post(t.URL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		return DispatchResult{Target: t.Name, Success: false, Error: t.Name + " unreachable"}
	}
	defer resp.Body.Close()
	return DispatchResult{Target: t.Name, Success: resp.StatusCode < 400, StatusCode: resp.StatusCode}
}
