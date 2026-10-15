CREATE TABLE `page_permissions` (
 `subject` VARCHAR(80) NOT NULL,
 `permissions` JSON NOT NULL,
 `version` INTEGER NOT NULL DEFAULT 1,
 `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`subject`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
