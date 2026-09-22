-- ========================================================
-- UIUC Research Portal - MySQL Initialization Script
-- ========================================================

CREATE DATABASE IF NOT EXISTS `uiuc_research`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- Grant privileges to uiuc_user
GRANT ALL PRIVILEGES ON `uiuc_research`.* TO 'uiuc_user'@'%';
FLUSH PRIVILEGES;

USE `uiuc_research`;

-- Simple health check table for initialization verification
CREATE TABLE IF NOT EXISTS `_docker_healthcheck` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `initialized_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `status` VARCHAR(32) NOT NULL DEFAULT 'READY'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `_docker_healthcheck` (`status`) VALUES ('READY');
