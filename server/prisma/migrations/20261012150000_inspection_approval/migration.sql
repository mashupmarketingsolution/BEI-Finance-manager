ALTER TABLE `site_inspections` ADD COLUMN `approvalState` VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED';
CREATE TABLE `inspection_approvals` (
 `id` INTEGER NOT NULL AUTO_INCREMENT,
 `inspectionId` INTEGER NOT NULL,
 `actorId` INTEGER NOT NULL,
 `actorRole` VARCHAR(30) NOT NULL,
 `action` VARCHAR(20) NOT NULL,
 `notes` TEXT NULL,
 `snapshot` JSON NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`),
 CONSTRAINT `inspection_approvals_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `site_inspections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `inspection_approvals_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
