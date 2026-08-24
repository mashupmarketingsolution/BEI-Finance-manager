-- CreateTable
CREATE TABLE `material_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `material_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `categoryId` INTEGER NULL,
    `subCategory` VARCHAR(100) NULL,
    `brand` VARCHAR(100) NULL,
    `modelCode` VARCHAR(100) NULL,
    `specification` TEXT NULL,
    `color` VARCHAR(100) NULL,
    `size` VARCHAR(100) NULL,
    `unit` VARCHAR(30) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `materials_code_key`(`code`),
    INDEX `materials_categoryId_idx`(`categoryId`),
    INDEX `materials_name_idx`(`name`),
    INDEX `materials_brand_idx`(`brand`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_material_prices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `materialId` INTEGER NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `minimumQty` DECIMAL(15, 2) NULL,
    `leadTimeDays` INTEGER NULL,
    `effectiveDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_material_prices_materialId_idx`(`materialId`),
    INDEX `vendor_material_prices_vendorId_idx`(`vendorId`),
    INDEX `vendor_material_prices_materialId_vendorId_idx`(`materialId`, `vendorId`),
    INDEX `vendor_material_prices_effectiveDate_idx`(`effectiveDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `material_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_material_prices` ADD CONSTRAINT `vendor_material_prices_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_material_prices` ADD CONSTRAINT `vendor_material_prices_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
