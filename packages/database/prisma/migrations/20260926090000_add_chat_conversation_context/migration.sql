ALTER TABLE `chat_requests`
ADD COLUMN `conversation_id` VARCHAR(191) NULL;

CREATE INDEX `chat_requests_conversation_id_created_at_idx`
ON `chat_requests`(`conversation_id`, `created_at`);
