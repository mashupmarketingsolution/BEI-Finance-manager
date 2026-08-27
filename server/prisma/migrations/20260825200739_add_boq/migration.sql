-- CreateTable
CREATE TABLE `boqs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `boqNo` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `projectId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'FINAL', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `boqs_boqNo_key`(`boqNo`),
    INDEX `boqs_projectId_idx`(`projectId`),
    INDEX `boqs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `boq_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `boqId` INTEGER NOT NULL,
    `materialId` INTEGER NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `estimatedUnitPrice` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `estimatedTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `boq_items_boqId_idx`(`boqId`),
    INDEX `boq_items_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `boqs` ADD CONSTRAINT `boqs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_boqId_fkey` FOREIGN KEY (`boqId`) REFERENCES `boqs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
