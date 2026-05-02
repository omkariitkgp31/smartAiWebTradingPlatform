package dispatcher

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"

	"github.com/stockbroker/order-service/config"
)

var cfg *config.Config

func Init(c *config.Config) { cfg = c }

type OrderEvent struct {
	OrderID     string  `json:"order_id"`
	UserID      string  `json:"user_id"`
	StockSymbol string  `json:"stock_symbol"`
	OrderType   string  `json:"order_type"`
	Quantity    float64 `json:"quantity"`
	Price       float64 `json:"price"`
}

// DispatchToQueue sends order event to Queue Processor (buy/sell endpoint)
func DispatchToQueue(event OrderEvent) {
	endpoint := "/buy"
	if event.OrderType == "SELL" {
		endpoint = "/sell"
	}
	url := cfg.QueueProcessorURL + endpoint

	body, _ := json.Marshal(event)
	go func() {
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
		if err != nil {
			log.Printf("⚠️ Queue Processor unreachable: %v", err)
			return
		}
		defer resp.Body.Close()
		log.Printf("✅ Dispatched %s to Queue Processor: %d", event.OrderType, resp.StatusCode)
	}()
}
