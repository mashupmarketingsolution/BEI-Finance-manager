-- AlterTable
ALTER TABLE `purchase_payments` ADD COLUMN `transactionId` INTEGER NULL;

-- AlterTable
ALTER TABLE `purchases` ADD COLUMN `dueDate` DATE NULL,
    ADD COLUMN `vendorBillNo` VARCHAR(100) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `purchase_payments_transactionId_key` ON `purchase_payments`(`transactionId`);

-- CreateIndex
CREATE UNIQUE INDEX `purchases_vendorId_vendorBillNo_key` ON `purchases`(`vendorId`, `vendorBillNo`);

-- AddForeignKey
ALTER TABLE `purchase_payments` ADD CONSTRAINT `purchase_payments_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

