package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/dps-wmhris/backend/internal/config"
	"github.com/google/uuid"
)

type StorageService interface {
	GeneratePresignedUploadUrl(ctx context.Context, originalName, mimeType, folder string) (url, key, publicUrl string, err error)
	DeleteFromR2(ctx context.Context, key string) (bool, error)
	UploadFile(ctx context.Context, fileContent []byte, originalName, mimeType, folder string) (publicUrl string, err error)
}

type storageServiceImpl struct{}

func NewStorageService() StorageService {
	return &storageServiceImpl{}
}

func (s *storageServiceImpl) GeneratePresignedUploadUrl(ctx context.Context, originalName, mimeType, folder string) (string, string, string, error) {
	if config.R2PresignClient == nil {
		return "", "", "", fmt.Errorf("S3 Client belum diinisialisasi. Periksa kredensial R2")
	}

	if folder == "" {
		folder = "uploads"
	}

	parts := strings.Split(originalName, ".")
	ext := parts[len(parts)-1]
	if len(parts) == 1 {
		ext = "" // no extension
	}

	randomStr := uuid.New().String()
	timestamp := time.Now().UnixMilli()

	uniqueFileName := fmt.Sprintf("%s/%d-%s", folder, timestamp, randomStr)
	if ext != "" {
		uniqueFileName += "." + ext
	}

	bucketName := os.Getenv("R2_BUCKET_NAME")

	req, err := config.R2PresignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(uniqueFileName),
		ContentType: aws.String(mimeType),
	}, func(po *s3.PresignOptions) {
		po.Expires = 5 * time.Minute
	})

	if err != nil {
		log.Printf("[STORAGE_SERVICE] Gagal membuat presigned URL: %v", err)
		return "", "", "", err
	}

	publicUrl := fmt.Sprintf("%s/%s", os.Getenv("R2_PUBLIC_URL"), uniqueFileName)

	return req.URL, uniqueFileName, publicUrl, nil
}

func (s *storageServiceImpl) DeleteFromR2(ctx context.Context, key string) (bool, error) {
	if config.R2Client == nil {
		log.Println("[STORAGE_SERVICE] S3 Client belum diinisialisasi. Lewati penghapusan dari R2")
		return false, nil
	}
	if key == "" {
		return false, nil
	}

	bucketName := os.Getenv("R2_BUCKET_NAME")
	_, err := config.R2Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucketName),
		Key:    aws.String(key),
	})

	if err != nil {
		log.Printf("[STORAGE_SERVICE] Gagal menghapus file dari R2 %s: %v", key, err)
		return false, err
	}
	return true, nil
}

func (s *storageServiceImpl) UploadFile(ctx context.Context, fileContent []byte, originalName, mimeType, folder string) (string, error) {
	if config.R2Client == nil {
		return "", fmt.Errorf("S3 Client belum diinisialisasi")
	}

	if folder == "" {
		folder = "exports"
	}

	parts := strings.Split(originalName, ".")
	ext := parts[len(parts)-1]
	if len(parts) == 1 {
		ext = ""
	}

	randomStr := uuid.New().String()
	timestamp := time.Now().UnixMilli()

	uniqueFileName := fmt.Sprintf("%s/%d-%s", folder, timestamp, randomStr)
	if ext != "" {
		uniqueFileName += "." + ext
	}

	bucketName := os.Getenv("R2_BUCKET_NAME")

	_, err := config.R2Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(uniqueFileName),
		Body:        strings.NewReader(string(fileContent)),
		ContentType: aws.String(mimeType),
	})

	if err != nil {
		log.Printf("[STORAGE_SERVICE] Gagal mengupload file ke R2: %v", err)
		return "", err
	}

	publicUrl := fmt.Sprintf("%s/%s", os.Getenv("R2_PUBLIC_URL"), uniqueFileName)
	return publicUrl, nil
}
