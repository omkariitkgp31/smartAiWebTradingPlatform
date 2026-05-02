package handlers

import (
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/stockbroker/price-update-service/database"
	"github.com/stockbroker/price-update-service/models"
)

type CompanyCreateReq struct {
	Symbol      string   `json:"symbol" binding:"required"`
	Name        string   `json:"name" binding:"required"`
	Sector      string   `json:"sector"`
	Description string   `json:"description"`
	Price       float64  `json:"current_price" binding:"required,gt=0"`
	MarketCap   *float64 `json:"market_cap"`
}

type PriceUpdateReq struct {
	Symbol string  `json:"symbol" binding:"required"`
	Price  float64 `json:"price" binding:"required,gt=0"`
}

type PriceCDCReq struct {
	Symbol        string   `json:"symbol" binding:"required"`
	Price         float64  `json:"price" binding:"required,gt=0"`
	Change        *float64 `json:"change"`
	ChangePercent *float64 `json:"change_percent"`
	Source        string   `json:"source"`
}

func round2(f float64) float64 {
	return math.Round(f*100) / 100
}

// GetCompanies lists companies with optional filters
func GetCompanies(c *gin.Context) {
	var companies []models.Company
	query := database.DB
	if s := c.Query("sector"); s != "" {
		query = query.Where("sector = ?", s)
	}
	if q := c.Query("search"); q != "" {
		query = query.Where("symbol LIKE ? OR name LIKE ?", "%"+q+"%", "%"+q+"%")
	}
	query.Order("symbol").Find(&companies)
	c.JSON(http.StatusOK, gin.H{"companies": companies, "total": len(companies)})
}

// GetCompanyData returns aggregated/change data for a symbol
func GetCompanyData(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	var company models.Company
	if err := database.DB.Where("symbol = ?", symbol).First(&company).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": symbol + " not found"})
		return
	}

	resp := gin.H{
		"symbol":         company.Symbol,
		"current_price":  company.CurrentPrice,
		"previous_close": company.PreviousClose,
		"day_high":       company.DayHigh,
		"day_low":        company.DayLow,
		"volume":         company.Volume,
	}
	if company.PreviousClose != nil && *company.PreviousClose > 0 {
		change := round2(company.CurrentPrice - *company.PreviousClose)
		changePct := round2((change / *company.PreviousClose) * 100)
		resp["change"] = change
		resp["change_percent"] = changePct
	}
	c.JSON(http.StatusOK, resp)
}

// AddCompany adds a new company
func AddCompany(c *gin.Context) {
	var req CompanyCreateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	symbol := strings.ToUpper(req.Symbol)
	var existing models.Company
	if database.DB.Where("symbol = ?", symbol).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": symbol + " already exists"})
		return
	}
	company := models.Company{
		Symbol: symbol, Name: req.Name, Sector: req.Sector,
		Description: req.Description, CurrentPrice: req.Price, MarketCap: req.MarketCap,
	}
	database.DB.Create(&company)
	c.JSON(http.StatusCreated, gin.H{"message": symbol + " added"})
}

// UpdatePrice updates price manually
func UpdatePrice(c *gin.Context) {
	var req PriceUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	symbol := strings.ToUpper(req.Symbol)
	var company models.Company
	if err := database.DB.Where("symbol = ?", symbol).First(&company).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": symbol + " not found"})
		return
	}

	prevClose := company.CurrentPrice
	company.PreviousClose = &prevClose
	company.CurrentPrice = req.Price
	if company.DayHigh == nil || req.Price > *company.DayHigh {
		company.DayHigh = &req.Price
	}
	if company.DayLow == nil || req.Price < *company.DayLow {
		company.DayLow = &req.Price
	}
	database.DB.Save(&company)

	change := round2(req.Price - prevClose)
	changePct := round2((change / prevClose) * 100)
	database.DB.Create(&models.PriceHistory{
		Symbol: symbol, Price: req.Price, Change: &change, ChangePercent: &changePct, Source: "manual",
	})
	c.JSON(http.StatusOK, gin.H{"message": symbol + " price updated"})
}

// PriceChangeCDC receives price change data capture from Queue Processor
func PriceChangeCDC(c *gin.Context) {
	var req PriceCDCReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	symbol := strings.ToUpper(req.Symbol)
	var company models.Company
	if database.DB.Where("symbol = ?", symbol).First(&company).Error == nil {
		prev := company.CurrentPrice
		company.PreviousClose = &prev
		company.CurrentPrice = req.Price
		if company.DayHigh == nil || req.Price > *company.DayHigh {
			company.DayHigh = &req.Price
		}
		if company.DayLow == nil || req.Price < *company.DayLow {
			company.DayLow = &req.Price
		}
		database.DB.Save(&company)
	}
	src := req.Source
	if src == "" {
		src = "queue_processor"
	}
	database.DB.Create(&models.PriceHistory{
		Symbol: symbol, Price: req.Price, Change: req.Change, ChangePercent: req.ChangePercent, Source: src,
	})
	c.JSON(http.StatusOK, gin.H{"message": "CDC captured: " + symbol})
}

// GetPriceHistory returns price history for a symbol
func GetPriceHistory(c *gin.Context) {
	symbol := strings.ToUpper(c.Param("symbol"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	var records []models.PriceHistory
	database.DB.Where("symbol = ?", symbol).Order("captured_at DESC").Limit(limit).Find(&records)
	c.JSON(http.StatusOK, gin.H{"history": records, "total": len(records)})
}
