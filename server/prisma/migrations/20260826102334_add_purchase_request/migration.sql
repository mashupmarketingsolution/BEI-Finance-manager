-- CreateTable
CREATE TABLE `purchase_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestNo` VARCHAR(50) NOT NULL,
    `requestDate` DATETIME(3) NOT NULL,
    `projectId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_requests_requestNo_key`(`requestNo`),
    INDEX `purchase_requests_projectId_idx`(`projectId`),
    INDEX `purchase_requests_status_idx`(`status`),
    INDEX `purchase_requests_requestDate_idx`(`requestDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_request_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseRequestId` INTEGER NOT NULL,
    `materialId` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `requiredDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_request_items_purchaseRequestId_idx`(`purchaseRequestId`),
    INDEX `purchase_request_items_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_purchaseRequestId_fkey` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
