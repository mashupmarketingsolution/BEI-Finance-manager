/*
  Warnings:

  - A unique constraint covering the columns `[purchaseId]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `purchase_orders` ADD COLUMN `purchaseId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `purchase_orders_purchaseId_key` ON `purchase_orders`(`purchaseId`);

-- CreateIndex
CREATE INDEX `purchase_orders_purchaseId_idx` ON `purchase_orders`(`purchaseId`);

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
