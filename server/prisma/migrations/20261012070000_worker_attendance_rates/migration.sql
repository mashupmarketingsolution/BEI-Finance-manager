CREATE TABLE `worker_rates` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `workerId` INTEGER NOT NULL,
  `projectId` INTEGER NOT NULL,
  `effectiveDate` DATETIME(3) NOT NULL,
  `dailyRate` DECIMAL(15,2) NOT NULL,
  `overtimeRate` DECIMAL(15,2) NOT NULL,
  UNIQUE INDEX `worker_rates_workerId_projectId_effectiveDate_key` (`workerId`,`projectId`,`effectiveDate`),
  PRIMARY KEY (`id`),
  CONSTRAINT `worker_rates_workerId_fkey` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `worker_rates_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `worker_attendance` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `workerId` INTEGER NOT NULL,
  `projectId` INTEGER NOT NULL,
  `workDate` DATETIME(3) NOT NULL,
  `dayUnits` DECIMAL(3,2) NOT NULL,
  `overtimeHours` DECIMAL(4,2) NOT NULL,
  `dailyRate` DECIMAL(15,2) NOT NULL,
  `overtimeRate` DECIMAL(15,2) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `notes` VARCHAR(500) NULL,
  `payrollAccrualId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `worker_attendance_workerId_workDate_key` (`workerId`,`workDate`),
  UNIQUE INDEX `worker_attendance_payrollAccrualId_key` (`payrollAccrualId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `worker_attendance_workerId_fkey` FOREIGN KEY (`workerId`) REFERENCES `workers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `worker_attendance_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `worker_attendance_payrollAccrualId_fkey` FOREIGN KEY (`payrollAccrualId`) REFERENCES `payroll_accruals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
