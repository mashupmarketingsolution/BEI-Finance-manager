CREATE TABLE `payroll_batches` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `reference` VARCHAR(100) NOT NULL,
  `fromDate` DATETIME(3) NOT NULL,
  `toDate` DATETIME(3) NOT NULL,
  `projectId` INTEGER NULL,
  `workerId` INTEGER NULL,
  `snapshot` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reversedAt` DATETIME(3) NULL,
  UNIQUE INDEX `payroll_batches_reference_key` (`reference`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payroll_accruals` ADD COLUMN `batchId` INTEGER NULL;
CREATE INDEX `payroll_accruals_batchId_fkey` ON `payroll_accruals` (`batchId`);
ALTER TABLE `payroll_accruals` ADD CONSTRAINT `payroll_accruals_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `payroll_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
