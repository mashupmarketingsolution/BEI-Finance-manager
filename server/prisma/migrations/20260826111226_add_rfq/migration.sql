-- CreateTable
CREATE TABLE `rfqs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rfqNo` VARCHAR(50) NOT NULL,
    `rfqDate` DATETIME(3) NOT NULL,
    `projectId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'QUOTED', 'EVALUATED', 'AWARDED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rfqs_rfqNo_key`(`rfqNo`),
    INDEX `rfqs_projectId_idx`(`projectId`),
    INDEX `rfqs_status_idx`(`status`),
    INDEX `rfqs_rfqDate_idx`(`rfqDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rfq_vendors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rfqId` INTEGER NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `quotedTotal` DECIMAL(15, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rfq_vendors_rfqId_idx`(`rfqId`),
    INDEX `rfq_vendors_vendorId_idx`(`vendorId`),
    UNIQUE INDEX `rfq_vendors_rfqId_vendorId_key`(`rfqId`, `vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rfq_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rfqId` INTEGER NOT NULL,
    `materialId` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rfq_items_rfqId_idx`(`rfqId`),
    INDEX `rfq_items_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rfqs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rfq_vendors` ADD CONSTRAINT `rfq_vendors_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rfq_items` ADD CONSTRAINT `rfq_items_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rfqs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rfq_items` ADD CONSTRAINT `rfq_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
