CREATE TABLE `researcher_topics` (
  `id` VARCHAR(191) NOT NULL,
  `researcher_id` VARCHAR(191) NOT NULL,
  `topic_id` VARCHAR(191) NOT NULL,
  `works_count` INTEGER NOT NULL DEFAULT 0,
  `rank` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `researcher_topics_researcher_id_topic_id_key` (`researcher_id`, `topic_id`),
  INDEX `researcher_topics_researcher_id_rank_idx` (`researcher_id`, `rank`),
  INDEX `researcher_topics_topic_id_works_count_idx` (`topic_id`, `works_count`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `researcher_topics`
ADD CONSTRAINT `researcher_topics_researcher_id_fkey`
FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `researcher_topics`
ADD CONSTRAINT `researcher_topics_topic_id_fkey`
FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
