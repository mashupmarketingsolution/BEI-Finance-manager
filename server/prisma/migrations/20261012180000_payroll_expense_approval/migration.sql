-- CreateTable
CREATE TABLE `financial_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(20) NOT NULL,
    `creatorId` INTEGER NOT NULL,
    `accrualId` INTEGER NULL,
    `payload` JSON NOT NULL,
    `snapshot` JSON NOT NULL,
    `targetFingerprint` VARCHAR(64) NULL,
    `state` VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    `version` INTEGER NOT NULL DEFAULT 1,
    `transactionId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `financial_requests_transactionId_key`(`transactionId`),
    INDEX `financial_requests_state_kind_idx`(`state`, `kind`),
    INDEX `financial_requests_accrualId_idx`(`accrualId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `actorId` INTEGER NOT NULL,
    `actorRole` VARCHAR(30) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `notes` TEXT NULL,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `financial_events_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `financial_requests` ADD CONSTRAINT `financial_requests_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_requests` ADD CONSTRAINT `financial_requests_accrualId_fkey` FOREIGN KEY (`accrualId`) REFERENCES `payroll_accruals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_requests` ADD CONSTRAINT `financial_requests_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_events` ADD CONSTRAINT `financial_events_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `financial_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_events` ADD CONSTRAINT `financial_events_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
