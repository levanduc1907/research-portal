CREATE TABLE `author_affiliations` (
  `id` VARCHAR(191) NOT NULL,
  `author_id` VARCHAR(191) NOT NULL,
  `institution_id` VARCHAR(191) NOT NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'RESEARCHER_PROFILE',
  `is_current` BOOLEAN NOT NULL DEFAULT true,
  `years` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `author_affiliations_author_id_institution_id_key` (`author_id`, `institution_id`),
  INDEX `author_affiliations_institution_id_is_current_idx` (`institution_id`, `is_current`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `author_affiliations`
ADD CONSTRAINT `author_affiliations_author_id_fkey`
FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `author_affiliations`
ADD CONSTRAINT `author_affiliations_institution_id_fkey`
FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `author_affiliations` (
  `id`,
  `author_id`,
  `institution_id`,
  `source`,
  `is_current`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  `r`.`author_id`,
  `i`.`id`,
  'RESEARCHER_PROFILE',
  true,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `researchers` AS `r`
INNER JOIN `institutions` AS `i`
  ON `i`.`openalex_id` LIKE '%I157725225'
WHERE `r`.`author_id` IS NOT NULL
ON DUPLICATE KEY UPDATE
  `source` = VALUES(`source`),
  `is_current` = true,
  `updated_at` = CURRENT_TIMESTAMP(3);
