UPDATE `embedding_records`
SET
  `model` = 'Xenova/multilingual-e5-small',
  `status` = 'PENDING',
  `qdrant_point_id` = NULL,
  `error_message` = NULL
WHERE `model` <> 'Xenova/multilingual-e5-small';

ALTER TABLE `embedding_records`
MODIFY COLUMN `model` VARCHAR(191) NOT NULL DEFAULT 'Xenova/multilingual-e5-small';
