CREATE INDEX `papers_publication_date_id_idx` ON `papers`(`publication_date`, `id`);
CREATE INDEX `papers_publication_year_publication_date_id_idx` ON `papers`(`publication_year`, `publication_date`, `id`);
CREATE INDEX `papers_cited_by_count_id_idx` ON `papers`(`cited_by_count`, `id`);
CREATE INDEX `researchers_cited_by_count_id_idx` ON `researchers`(`cited_by_count`, `id`);
CREATE INDEX `researchers_works_count_id_idx` ON `researchers`(`works_count`, `id`);
CREATE UNIQUE INDEX `researchers_email_key` ON `researchers`(`email`);
CREATE INDEX `import_runs_source_status_updated_at_idx` ON `import_runs`(`source`, `status`, `updated_at`);
