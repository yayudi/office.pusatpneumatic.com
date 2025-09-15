-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 11, 2025 at 05:20 PM
-- Server version: 10.11.13-MariaDB-cll-lve
-- PHP Version: 8.3.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u1773579_office`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`) VALUES
(1, 'admin', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(2, 'viimend', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(3, 'ipunk', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(4, 'hesti', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(5, 'mila', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(6, 'naura', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(7, 'iday', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(8, 'delon', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(9, 'maruf', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(10, 'hadi', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(11, 'baron', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(12, 'anton', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(13, 'aldi', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(14, 'nata', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(15, 'akang', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(16, 'riyan', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(17, 'midin', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(18, 'furqon', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(19, 'ipul', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(20, 'dika', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(21, 'lukman', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(22, 'kemod', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(23, 'faisal', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(24, 'robi', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(25, 'adi', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(26, 'soblo', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(27, 'doyok', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(28, 'sahri', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(29, 'saepi', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(30, 'sarda', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(31, 'naila', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(32, 'wakil', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(33, 'ae', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(34, 'aldip', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(35, 'irfan', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(36, 'badoy', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(37, 'lanang', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(38, 'aji', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(39, 'juanda', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(40, 'sarip', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(41, 'maulana', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(42, 'fariq', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm'),
(43, 'martin', '$2y$10$kjs7x2JP5SzIV3zDbqbvYe2cZHPaiR2Fn6xFlYFRBbF4fmvKF.ubm');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `id` (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2147483648;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
