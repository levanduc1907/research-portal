CREATE TABLE `ai_credentials` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(191) NOT NULL,
  `encrypted_api_key` LONGTEXT NOT NULL,
  `encryption_iv` VARCHAR(191) NOT NULL,
  `encryption_tag` VARCHAR(191) NOT NULL,
  `key_hint` VARCHAR(191) NOT NULL,
  `base_url` TEXT NULL,
  `default_model` VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `last_tested_at` DATETIME(3) NULL,
  `last_test_status` VARCHAR(191) NULL,
  `last_error` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ai_credentials_name_key` (`name`),
  INDEX `ai_credentials_provider_is_active_idx` (`provider`, `is_active`),
  INDEX `ai_credentials_is_default_idx` (`is_default`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
