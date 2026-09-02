package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AdminUserHandler struct {
	adminUserService service.AdminUserService
}

func NewAdminUserHandler(adminUserService service.AdminUserService) *AdminUserHandler {
	return &AdminUserHandler{adminUserService: adminUserService}
}

func (h *AdminUserHandler) GetUsers(c *gin.Context) {
	users, err := h.adminUserService.GetAllUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data user",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"users":   users,
	})
}

// GetRoles acts as a proxy/alias for frontend compatibility
func (h *AdminUserHandler) GetRoles(c *gin.Context) {
	roles, err := h.adminUserService.GetRoles(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data role",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"roles":   roles, // Note: frontend might expect "roles" instead of "data" based on Node.js controller
	})
}

func (h *AdminUserHandler) CreateUser(c *gin.Context) {
	var req dto.AdminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format input tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	adminID := c.GetInt("user_id")
	newUser, err := h.adminUserService.CreateUser(c.Request.Context(), req, adminID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		if strings.Contains(err.Error(), "1062") || strings.Contains(err.Error(), "Duplicate") {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"message": "Username sudah digunakan.",
				"error_code": "CONFLICT",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal membuat pengguna",
			"error_code": "CREATE_FAILED",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Pengguna berhasil dibuat.",
		"data":    newUser,
	})
}

func (h *AdminUserHandler) UpdateUser(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Pengguna tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	var req dto.AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format input tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	adminID := c.GetInt("user_id")
	err = h.adminUserService.UpdateUser(c.Request.Context(), targetID, req, adminID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		if strings.Contains(err.Error(), "1062") || strings.Contains(err.Error(), "Duplicate") {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"message": "Username sudah digunakan.",
				"error_code": "CONFLICT",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memperbarui data pengguna: " + err.Error(),
			"error_code": "UPDATE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Data pengguna berhasil diperbarui.",
	})
}

func (h *AdminUserHandler) DeleteUser(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Pengguna tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	adminID := c.GetInt("user_id")
	err = h.adminUserService.DeleteUser(c.Request.Context(), targetID, adminID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "anda tidak bisa menghapus akun anda sendiri" || err.Error() == "user tidak ditemukan" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{
			"success": false,
			"message": err.Error(),
			"error_code": "DELETE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User berhasil dihapus.",
	})
}

func (h *AdminUserHandler) GetUserLocations(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Pengguna tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	locationIDs, err := h.adminUserService.GetUserLocations(c.Request.Context(), targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil lokasi user",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    locationIDs,
	})
}

func (h *AdminUserHandler) UpdateUserLocations(c *gin.Context) {
	targetID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Pengguna tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	var req dto.AdminUpdateUserLocationsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format input tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	adminID := c.GetInt("user_id")
	err = h.adminUserService.UpdateUserLocations(c.Request.Context(), targetID, req, adminID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		if strings.Contains(err.Error(), "1452") || strings.Contains(err.Error(), "foreign key") {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Satu atau lebih ID lokasi tidak valid.",
				"error_code": "INVALID_REFERENCE",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal memperbarui izin lokasi pengguna",
			"error_code": "UPDATE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Izin lokasi pengguna berhasil diperbarui.",
	})
}
