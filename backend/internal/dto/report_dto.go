package dto

import "time"

type ReportFilterResponse struct {
	AllBuildings       []string            `json:"allBuildings"`
	Purposes           []string            `json:"purposes"`
	BuildingsByPurpose map[string][]string `json:"buildingsByPurpose"`
}

type UserExportJobResponse struct {
	ID           int       `json:"id"`
	Status       string    `json:"status"`
	FilePath     *string   `json:"file_path"`
	ErrorMessage *string   `json:"error_message"`
	CreatedAt    *time.Time `json:"created_at"`
	Filters      *string   `json:"filters"`
	Type         string    `json:"type"`
	DownloadURL  *string   `json:"download_url"`
}
