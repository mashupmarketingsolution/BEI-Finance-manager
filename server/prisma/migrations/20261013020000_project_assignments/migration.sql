-- CreateTable
CREATE TABLE `user_project_assignments` (
    `userId` INTEGER NOT NULL,
    `projectId` INTEGER NOT NULL,

    INDEX `user_project_assignments_projectId_idx`(`projectId`),
    PRIMARY KEY (`userId`, `projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_project_assignments` ADD CONSTRAINT `user_project_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_project_assignments` ADD CONSTRAINT `user_project_assignments_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
