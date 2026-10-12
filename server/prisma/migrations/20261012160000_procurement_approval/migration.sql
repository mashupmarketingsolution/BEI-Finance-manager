CREATE TABLE `procurement_approvals` (
 `id` INTEGER NOT NULL AUTO_INCREMENT, `requestId` INTEGER NULL, `orderId` INTEGER NULL, `creatorId` INTEGER NULL,
 `state` VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED', `version` INTEGER NOT NULL DEFAULT 1,
 `approvedFingerprint` VARCHAR(64) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `procurement_approvals_requestId_key` (`requestId`), UNIQUE INDEX `procurement_approvals_orderId_key` (`orderId`),
 CONSTRAINT `procurement_approvals_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `procurement_approvals_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `procurement_approvals_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `procurement_approval_events` (
 `id` INTEGER NOT NULL AUTO_INCREMENT, `approvalId` INTEGER NOT NULL, `actorId` INTEGER NOT NULL,
 `actorRole` VARCHAR(30) NOT NULL, `action` VARCHAR(20) NOT NULL, `notes` TEXT NULL, `snapshot` JSON NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
 CONSTRAINT `procurement_approval_events_approvalId_fkey` FOREIGN KEY (`approvalId`) REFERENCES `procurement_approvals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `procurement_approval_events_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
