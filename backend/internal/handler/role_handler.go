package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type RoleHandler struct {
	roleService service.RoleService
}

func NewRoleHandler(roleService service.RoleService) *RoleHandler {
	return &RoleHandler{roleService: roleService}
}

func (h *RoleHandler) GetRoles(c *gin.Context) {
	roles, err := h.roleService.GetRoles(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data peran",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    roles,
	})
}

func (h *RoleHandler) GetPermissions(c *gin.Context) {
	permissions, err := h.roleService.GetPermissions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil data izin",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    permissions,
	})
}

func (h *RoleHandler) GetRolePermissions(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Peran tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	permissionIDs, err := h.roleService.GetRolePermissions(c.Request.Context(), roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gagal mengambil izin peran",
			"error_code": "INTERNAL_SERVER_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    permissionIDs,
	})
}

func (h *RoleHandler) AssignPermissions(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Peran tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	var req dto.AssignPermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Format input tidak valid",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := c.GetInt("user_id")
	err = h.roleService.UpdateRolePermissions(c.Request.Context(), roleID, req, userID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Gagal memperbarui izin. " + err.Error(),
			"error_code": "UPDATE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Izin berhasil diperbarui",
	})
}

func (h *RoleHandler) CreateRole(c *gin.Context) {
	var req dto.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama peran wajib diisi",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := c.GetInt("user_id")
	newID, err := h.roleService.CreateRole(c.Request.Context(), req, userID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Gagal membuat peran",
			"error_code": "CREATE_FAILED",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Peran berhasil dibuat",
		"data": gin.H{
			"id": newID,
		},
	})
}

func (h *RoleHandler) UpdateRole(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Peran tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	var req dto.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Nama peran wajib diisi",
			"error_code": "VALIDATION_ERROR",
		})
		return
	}

	userID := c.GetInt("user_id")
	err = h.roleService.UpdateRole(c.Request.Context(), roleID, req, userID, c.ClientIP(), c.Request.UserAgent())
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
		"message": "Peran berhasil diperbarui",
	})
}

func (h *RoleHandler) DeleteRole(c *gin.Context) {
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ID Peran tidak valid",
			"error_code": "INVALID_ID",
		})
		return
	}

	userID := c.GetInt("user_id")
	err = h.roleService.DeleteRole(c.Request.Context(), roleID, userID, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Gagal menghapus peran (mungkin sedang digunakan).",
			"error_code": "DELETE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Peran berhasil dihapus",
	})
}
