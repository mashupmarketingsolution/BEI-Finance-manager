ALTER TABLE `transactions` MODIFY `source` ENUM('WORKER_ADVANCE','CLIENT_PAYMENT','MANUAL','PURCHASE','PURCHASE_PAYMENT') NOT NULL DEFAULT 'MANUAL';

CREATE TABLE `worker_advances` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `workerId` INTEGER NOT NULL,
  `projectId` INTEGER NOT NULL,
  `transactionId` INTEGER NULL,
  `reference` VARCHAR(100) NOT NULL,
  `paymentDate` DATETIME(3) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `paymentMethod` ENUM('CASH','BANK','MOBILE_BANKING','OTHER') NOT NULL,
  `notes` VARCHAR(500) NULL,
  `reversedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `worker_advances_transactionId_key` (`transactionId`),
  UNIQUE INDEX `worker_advances_reference_key` (`reference`),
  PRIMARY KEY (`id`),
  CONSTRAINT `worker_advances_workerId_fkey` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `worker_advances_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `worker_advances_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `worker_advance_allocations` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `advanceId` INTEGER NOT NULL,
  `accrualId` INTEGER NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `allocationDate` DATETIME(3) NOT NULL,
  UNIQUE INDEX `worker_advance_allocations_advanceId_accrualId_key` (`advanceId`,`accrualId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `worker_advance_allocations_advanceId_fkey` FOREIGN KEY (`advanceId`) REFERENCES `worker_advances`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `worker_advance_allocations_accrualId_fkey` FOREIGN KEY (`accrualId`) REFERENCES `payroll_accruals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
