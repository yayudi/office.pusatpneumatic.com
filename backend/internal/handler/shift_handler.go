package handler

import (
	"net/http"
	"strconv"

	"github.com/dps-wmhris/backend/internal/dto"
	"github.com/dps-wmhris/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type ShiftHandler struct {
	shiftService service.ShiftService
}

func NewShiftHandler(shiftService service.ShiftService) *ShiftHandler {
	return &ShiftHandler{shiftService: shiftService}
}

func (h *ShiftHandler) GetAll(c *gin.Context) {
	shifts, err := h.shiftService.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": shifts})
}

func (h *ShiftHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID", "error_code": "VALIDATION_ERROR"})
		return
	}

	shift, err := h.shiftService.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Shift not found", "error_code": "NOT_FOUND"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": shift})
}

func (h *ShiftHandler) Create(c *gin.Context) {
	var req dto.CreateShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	id, err := h.shiftService.Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "SERVICE_ERROR"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Shift created", "data": gin.H{"id": id}})
}

func (h *ShiftHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID", "error_code": "VALIDATION_ERROR"})
		return
	}

	var req dto.UpdateShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error(), "error_code": "VALIDATION_ERROR"})
		return
	}

	err = h.shiftService.Update(c.Request.Context(), id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "SERVICE_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Shift updated"})
}

func (h *ShiftHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid ID", "error_code": "VALIDATION_ERROR"})
		return
	}

	err = h.shiftService.Delete(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error(), "error_code": "SERVICE_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Shift deleted"})
}
