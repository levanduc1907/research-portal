ALTER TABLE `researchers` ADD COLUMN `slug` VARCHAR(191) NULL;

CREATE TEMPORARY TABLE `researcher_slug_backfill` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `base_slug` VARCHAR(160) NOT NULL,
  `slug_suffix` VARCHAR(30) NULL
);

INSERT INTO `researcher_slug_backfill` (`id`, `base_slug`, `slug_suffix`)
SELECT
  `id`,
  LEFT(
    TRIM(BOTH '-' FROM REGEXP_REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        LOWER(`name`),
        'á', 'a'), 'à', 'a'), 'â', 'a'), 'ä', 'a'), 'ã', 'a'), 'å', 'a'),
        'ç', 'c'), 'č', 'c'), 'đ', 'd'), 'ð', 'd'),
        'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'),
        'í', 'i'), 'ì', 'i'), 'î', 'i'), 'ï', 'i'),
        'ñ', 'n'), 'ó', 'o'), 'ò', 'o'), 'ô', 'o'), 'ö', 'o'), 'ø', 'o'),
      '[^a-z0-9]+', '-'
    )),
    150
  ),
  NULLIF(
    LEFT(
      TRIM(BOTH '-' FROM REGEXP_REPLACE(
        LOWER(SUBSTRING_INDEX(COALESCE(`email`, ''), '@', 1)),
        '[^a-z0-9]+', '-'
      )),
      30
    ),
    ''
  )
FROM `researchers`;

UPDATE `researcher_slug_backfill`
SET `base_slug` = CONCAT('researcher-', LEFT(`id`, 8))
WHERE `base_slug` = '';

CREATE TEMPORARY TABLE `researcher_slug_counts` (
  `base_slug` VARCHAR(160) NOT NULL PRIMARY KEY,
  `slug_count` INT NOT NULL
);

INSERT INTO `researcher_slug_counts` (`base_slug`, `slug_count`)
SELECT `base_slug`, COUNT(*)
FROM `researcher_slug_backfill`
GROUP BY `base_slug`;

UPDATE `researchers` AS `r`
INNER JOIN `researcher_slug_backfill` AS `s` ON `s`.`id` = `r`.`id`
INNER JOIN `researcher_slug_counts` AS `counts`
  ON `counts`.`base_slug` = `s`.`base_slug`
SET `r`.`slug` = CASE
  WHEN `counts`.`slug_count` = 1 THEN `s`.`base_slug`
  ELSE CONCAT(
    `s`.`base_slug`,
    '-',
    COALESCE(`s`.`slug_suffix`, LEFT(`s`.`id`, 8))
  )
END;

DROP TEMPORARY TABLE `researcher_slug_backfill`;
DROP TEMPORARY TABLE `researcher_slug_counts`;

ALTER TABLE `researchers` MODIFY `slug` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `researchers_slug_key` ON `researchers`(`slug`);
