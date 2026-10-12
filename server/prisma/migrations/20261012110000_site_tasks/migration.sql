CREATE TABLE `site_tasks` (
 `id` INTEGER NOT NULL AUTO_INCREMENT,
 `projectId` INTEGER NOT NULL,
 `title` VARCHAR(150) NOT NULL,
 `description` TEXT NULL,
 `blockers` TEXT NULL,
 `startDate` DATETIME(3) NOT NULL,
 `dueDate` DATETIME(3) NOT NULL,
 `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 `priority` VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
 `responsibleId` INTEGER NULL,
 `createdById` INTEGER NOT NULL,
 `updatedById` INTEGER NOT NULL,
 `completedAt` DATETIME(3) NULL,
 `archivedAt` DATETIME(3) NULL,
 `version` INTEGER NOT NULL DEFAULT 1,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`),
 INDEX `site_tasks_projectId_status_dueDate_idx` (`projectId`,`status`,`dueDate`),
 CONSTRAINT `site_tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT `site_tasks_responsibleId_fkey` FOREIGN KEY (`responsibleId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT `site_tasks_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT `site_tasks_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `site_task_reports` (
 `taskId` INTEGER NOT NULL,
 `reportId` INTEGER NOT NULL,
 PRIMARY KEY (`taskId`,`reportId`),
 CONSTRAINT `site_task_reports_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `site_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `site_task_reports_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `site_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
