-- CreateTable
CREATE TABLE `payroll_accruals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `workerId` INTEGER NOT NULL,
    `reference` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `earnedDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payroll_accruals_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accrualId` INTEGER NOT NULL,
    `transactionId` INTEGER NOT NULL,

    UNIQUE INDEX `payroll_payments_transactionId_key`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `overhead_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionId` INTEGER NOT NULL,
    `projectId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,

    UNIQUE INDEX `overhead_allocations_transactionId_projectId_key`(`transactionId`, `projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payroll_accruals` ADD CONSTRAINT `payroll_accruals_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_accruals` ADD CONSTRAINT `payroll_accruals_workerId_fkey` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_payments` ADD CONSTRAINT `payroll_payments_accrualId_fkey` FOREIGN KEY (`accrualId`) REFERENCES `payroll_accruals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_payments` ADD CONSTRAINT `payroll_payments_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overhead_allocations` ADD CONSTRAINT `overhead_allocations_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `overhead_allocations` ADD CONSTRAINT `overhead_allocations_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
