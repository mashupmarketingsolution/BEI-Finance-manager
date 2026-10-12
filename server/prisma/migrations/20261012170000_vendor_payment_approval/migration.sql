-- CreateTable
CREATE TABLE `vendor_payment_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseId` INTEGER NOT NULL,
    `creatorId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paymentDate` DATE NOT NULL,
    `paymentMethod` ENUM('CASH', 'BANK', 'MOBILE_BANKING', 'OTHER') NOT NULL,
    `referenceNo` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `state` VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    `version` INTEGER NOT NULL DEFAULT 1,
    `billFingerprint` VARCHAR(64) NOT NULL,
    `snapshot` JSON NOT NULL,
    `paymentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_payment_requests_paymentId_key`(`paymentId`),
    INDEX `vendor_payment_requests_state_idx`(`state`),
    INDEX `vendor_payment_requests_purchaseId_idx`(`purchaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_payment_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `actorId` INTEGER NOT NULL,
    `actorRole` VARCHAR(30) NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `notes` TEXT NULL,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_payment_events_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendor_payment_requests` ADD CONSTRAINT `vendor_payment_requests_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payment_requests` ADD CONSTRAINT `vendor_payment_requests_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payment_requests` ADD CONSTRAINT `vendor_payment_requests_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `purchase_payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payment_events` ADD CONSTRAINT `vendor_payment_events_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `vendor_payment_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payment_events` ADD CONSTRAINT `vendor_payment_events_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
