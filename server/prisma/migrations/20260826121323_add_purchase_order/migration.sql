-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poNo` VARCHAR(50) NOT NULL,
    `poDate` DATETIME(3) NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `projectId` INTEGER NULL,
    `rfqId` INTEGER NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `transportCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_orders_poNo_key`(`poNo`),
    INDEX `purchase_orders_vendorId_idx`(`vendorId`),
    INDEX `purchase_orders_projectId_idx`(`projectId`),
    INDEX `purchase_orders_rfqId_idx`(`rfqId`),
    INDEX `purchase_orders_status_idx`(`status`),
    INDEX `purchase_orders_poDate_idx`(`poDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseOrderId` INTEGER NOT NULL,
    `materialId` INTEGER NOT NULL,
    `quantity` DECIMAL(15, 3) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `total` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_order_items_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `purchase_order_items_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rfqs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
