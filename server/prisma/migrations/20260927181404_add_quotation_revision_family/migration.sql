/*
  Warnings:

  - A unique constraint covering the columns `[originalQuotationId,revisionNo]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `quotations` ADD COLUMN `originalQuotationId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `quotations_originalQuotationId_idx` ON `quotations`(`originalQuotationId`);

-- CreateIndex
CREATE UNIQUE INDEX `quotations_originalQuotationId_revisionNo_key` ON `quotations`(`originalQuotationId`, `revisionNo`);

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_originalQuotationId_fkey` FOREIGN KEY (`originalQuotationId`) REFERENCES `quotations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
