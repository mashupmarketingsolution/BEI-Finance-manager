-- AlterTable
ALTER TABLE `transactions` MODIFY `source` ENUM('CLIENT_PAYMENT', 'MANUAL', 'PURCHASE', 'PURCHASE_PAYMENT') NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE `client_invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceNo` VARCHAR(50) NOT NULL,
    `customerId` INTEGER NOT NULL,
    `projectId` INTEGER NOT NULL,
    `milestoneId` INTEGER NULL,
    `customerName` VARCHAR(150) NOT NULL,
    `customerAddress` TEXT NULL,
    `invoiceDate` DATE NOT NULL,
    `dueDate` DATE NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'VOID') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `client_invoices_invoiceNo_key`(`invoiceNo`),
    UNIQUE INDEX `client_invoices_milestoneId_key`(`milestoneId`),
    INDEX `client_invoices_customerId_idx`(`customerId`),
    INDEX `client_invoices_projectId_idx`(`projectId`),
    INDEX `client_invoices_status_dueDate_idx`(`status`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `transactionId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoice_payments_transactionId_key`(`transactionId`),
    INDEX `invoice_payments_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_invoices` ADD CONSTRAINT `client_invoices_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_invoices` ADD CONSTRAINT `client_invoices_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_invoices` ADD CONSTRAINT `client_invoices_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `quotation_payment_milestones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `client_invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_payments` ADD CONSTRAINT `invoice_payments_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

