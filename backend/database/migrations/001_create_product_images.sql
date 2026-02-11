CREATE TABLE `product_images` (
    `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` int(11) UNSIGNED NOT NULL,
    `image_path` varchar(255) NOT NULL,
    `is_primary` tinyint(1) DEFAULT 0 COMMENT '1 = Gambar Utama, 0 = Galeri',
    `sort_order` int(11) DEFAULT 0 COMMENT 'Urutan tampilan',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_product_images_product` (`product_id`),
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;