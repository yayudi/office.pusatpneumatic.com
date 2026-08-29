package main

import (
	"log"
	"net/http"

	"github.com/dps-wmhris/backend/internal/config"
	"github.com/dps-wmhris/backend/internal/database"
	"github.com/dps-wmhris/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load Configurations
	config.LoadConfig()

	// 2. Setup Database Connection
	db := database.ConnectDB()
	defer db.Close()

	// 3. Initialize Gin Router
	if config.AppConfig.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()

	// 4. Attach Global Middlewares
	r.Use(gin.Logger())
	r.Use(middleware.GlobalErrorHandler())

	// 5. Setup Routes
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "pong",
			"data":    nil,
		})
	})

	// 6. Start Server
	log.Printf("Starting server on port %s...", config.AppConfig.Port)
	if err := r.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
