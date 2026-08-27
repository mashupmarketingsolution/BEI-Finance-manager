-- AlterTable
ALTER TABLE `rfqs` ADD COLUMN `awardedVendorId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `rfqs` ADD CONSTRAINT `rfqs_awardedVendorId_fkey` FOREIGN KEY (`awardedVendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
