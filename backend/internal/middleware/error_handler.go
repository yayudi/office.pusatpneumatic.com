package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorResponse mendefinisikan struktur response JSON sesuai kontrak (berbeda dengan struktur sukses).
type ErrorResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	ErrorCode string `json:"error_code"`
}

// GlobalErrorHandler menangkap panic (recovery) dan memastikan response berbentuk JSON.
func GlobalErrorHandler() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success:   false,
			Message:   "Terjadi kesalahan internal pada server.",
			ErrorCode: "SERVER_ERROR",
		})
		c.Abort()
	})
}
