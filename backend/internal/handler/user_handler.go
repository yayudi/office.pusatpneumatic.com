package handler

import (
	"log"
	"net/http"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

func (h *UserHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[LOGIN] Bind error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"message":    "Format input tidak valid (username & password diwajibkan)",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	log.Printf("[LOGIN] Attempting login for username: %s", req.Username)

	res, err := h.userService.Login(c.Request.Context(), req)
	if err != nil {
		log.Printf("[LOGIN] Login failed for user %s: %v", req.Username, err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"success":    false,
			"message":    err.Error(),
			"error_code": "UNAUTHORIZED",
		})
		return
	}

	log.Printf("[LOGIN] Login success for user: %s (ID: %d)", res.UserInfo.Username, res.UserInfo.ID)
	
	// Set JWT to HttpOnly Cookie
	c.SetCookie("token", res.Token, 86400*7, "/", "", false, true) // 7 days, HttpOnly

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login berhasil",
		"token":   res.Token,
		"user":    res.UserInfo,
	})
}

func (h *UserHandler) Logout(c *gin.Context) {
	c.SetCookie("token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out",
	})
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := c.GetInt("user_id")
	log.Printf("[PROFILE] Fetching profile for user_id: %v", userID)
	
	user, err := h.userService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		log.Printf("[PROFILE] Failed to fetch profile for user_id %d: %v", userID, err)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": err.Error(),
			"error_code": "NOT_FOUND",
		})
		return
	}

	log.Printf("[PROFILE] Profile fetched successfully for user_id %d", userID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data profil berhasil diambil.",
		"user":    user,
	})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetInt("user_id")
	
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format input tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	updatedUser, err := h.userService.UpdateProfile(c.Request.Context(), userID, req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
			"error_code": "UPDATE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data akun berhasil diperbarui.",
		"user":    updatedUser,
	})
}

func (h *UserHandler) GetMyLocations(c *gin.Context) {
	userID := c.GetInt("user_id")
	
	locations, err := h.userService.GetMyLocations(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data lokasi",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    locations,
	})
}
