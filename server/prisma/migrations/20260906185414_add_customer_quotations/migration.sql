-- CreateTable
CREATE TABLE `quotations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationNo` VARCHAR(50) NOT NULL,
    `customerId` INTEGER NOT NULL,
    `projectId` INTEGER NOT NULL,
    `quotationDate` DATETIME(3) NOT NULL,
    `validUntil` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `revisionNo` INTEGER NOT NULL DEFAULT 1,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `discountType` ENUM('PERCENT', 'FIXED') NULL,
    `discountValue` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `taxType` ENUM('PERCENT', 'FIXED') NULL,
    `taxRate` DECIMAL(8, 3) NOT NULL DEFAULT 0.00,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `grandTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `paymentTerms` TEXT NULL,
    `termsAndConditions` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quotations_quotationNo_key`(`quotationNo`),
    INDEX `quotations_customerId_idx`(`customerId`),
    INDEX `quotations_projectId_idx`(`projectId`),
    INDEX `quotations_status_idx`(`status`),
    INDEX `quotations_quotationDate_idx`(`quotationDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `specification` TEXT NULL,
    `pricingType` ENUM('UNIT_PRICE', 'FIXED_AMOUNT') NOT NULL DEFAULT 'UNIT_PRICE',
    `quantity` DECIMAL(15, 3) NULL,
    `unit` VARCHAR(30) NULL,
    `unitPrice` DECIMAL(15, 2) NULL,
    `lineTotal` DECIMAL(15, 2) NOT NULL,
    `materialId` INTEGER NULL,
    `boqItemId` INTEGER NULL,
    `notes` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quotation_items_quotationId_idx`(`quotationId`),
    INDEX `quotation_items_materialId_idx`(`materialId`),
    INDEX `quotation_items_boqItemId_idx`(`boqItemId`),
    INDEX `quotation_items_pricingType_idx`(`pricingType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_payment_milestones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` INTEGER NOT NULL,
    `milestoneNo` INTEGER NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `percentage` DECIMAL(8, 3) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `dueTrigger` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `quotation_payment_milestones_quotationId_idx`(`quotationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_boqItemId_fkey` FOREIGN KEY (`boqItemId`) REFERENCES `boq_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_payment_milestones` ADD CONSTRAINT `quotation_payment_milestones_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
