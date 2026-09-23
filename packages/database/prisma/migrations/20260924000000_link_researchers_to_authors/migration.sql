ALTER TABLE `researchers` ADD COLUMN `author_id` VARCHAR(191) NULL;

UPDATE `researchers` AS `r`
INNER JOIN `authors` AS `a` ON `a`.`openalex_id` = `r`.`openalex_id`
SET `r`.`author_id` = `a`.`id`
WHERE `r`.`openalex_id` IS NOT NULL;

CREATE UNIQUE INDEX `researchers_author_id_key` ON `researchers`(`author_id`);

ALTER TABLE `researchers`
ADD CONSTRAINT `researchers_author_id_fkey`
FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;
