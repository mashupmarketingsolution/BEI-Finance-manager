ALTER TABLE `users`
 ADD COLUMN `role` ENUM('ADMIN','ACCOUNTS','PROJECT_MANAGER','SITE_SUPERVISOR') NOT NULL DEFAULT 'SITE_SUPERVISOR',
 ADD COLUMN `accessVersion` INTEGER NOT NULL DEFAULT 1;
-- Existing users previously had unrestricted business access; preserve it during rollout.
-- New users receive the restricted database default.
UPDATE `users` SET `role` = 'ADMIN';
