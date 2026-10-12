-- CreateTable
CREATE TABLE `audit_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NOT NULL,
    `actorName` VARCHAR(150) NOT NULL,
    `actorUsername` VARCHAR(50) NOT NULL,
    `actorRole` VARCHAR(30) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(300) NOT NULL,
    `resource` VARCHAR(80) NOT NULL,
    `recordId` INTEGER NULL,
    `action` VARCHAR(40) NOT NULL,
    `outcome` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `statusCode` INTEGER NULL,
    `changedFields` JSON NOT NULL,
    `beforeSnapshot` JSON NULL,
    `afterSnapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `audit_events_createdAt_idx`(`createdAt`),
    INDEX `audit_events_actorId_idx`(`actorId`),
    INDEX `audit_events_resource_recordId_idx`(`resource`, `recordId`),
    INDEX `audit_events_outcome_idx`(`outcome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
