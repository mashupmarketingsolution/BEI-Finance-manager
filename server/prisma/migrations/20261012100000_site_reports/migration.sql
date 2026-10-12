CREATE TABLE `site_reports` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `projectId` INTEGER NOT NULL,
  `reportDate` DATETIME(3) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `workSummary` TEXT NOT NULL,
  `progress` DECIMAL(5,2) NOT NULL,
  `issues` TEXT NULL,
  `nextPlan` TEXT NULL,
  `responsibleId` INTEGER NULL,
  `createdById` INTEGER NOT NULL,
  `updatedById` INTEGER NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `archivedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `site_reports_projectId_reportDate_key` (`projectId`,`reportDate`),
  PRIMARY KEY (`id`),
  CONSTRAINT `site_reports_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `site_reports_responsibleId_fkey` FOREIGN KEY (`responsibleId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `site_reports_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `site_reports_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_photos` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `reportId` INTEGER NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `mime` VARCHAR(30) NOT NULL,
  `size` INTEGER NOT NULL,
  `data` MEDIUMBLOB NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `site_photos_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `site_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
