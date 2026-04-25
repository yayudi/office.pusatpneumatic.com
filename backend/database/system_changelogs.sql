CREATE TABLE IF NOT EXISTS `system_changelogs` (
    `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `version` varchar(50) NOT NULL,
    `title` varchar(255) NOT NULL,
    `description` text NOT NULL,
    `type` enum('FEATURE', 'BUGFIX', 'IMPROVEMENT', 'UI/UX') NOT NULL DEFAULT 'FEATURE',
    `release_date` date NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `system_changelogs` (`version`, `title`, `description`, `type`, `release_date`) VALUES
('v1.2.0', 'Sistem Panduan & Hotkeys Terintegrasi', 'Implementasi halaman panduan lengkap dengan navigasi sidebar dan global hotkeys menggunakan @vueuse/core.', 'FEATURE', CURDATE()),
('v1.1.5', 'PWA Support (Progressive Web App)', 'Aplikasi sekarang dapat diinstal di desktop maupun perangkat mobile dengan kapabilitas offline dasar.', 'IMPROVEMENT', '2026-04-20'),
('v1.1.0', 'Modul Batch Linking Media', 'Dukungan untuk mengaitkan banyak gambar dan video secara langsung ke multi-produk (background processing).', 'FEATURE', '2026-04-18');
