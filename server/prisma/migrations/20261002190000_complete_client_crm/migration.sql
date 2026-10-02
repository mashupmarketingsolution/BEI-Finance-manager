ALTER TABLE `customers` ADD COLUMN `source` ENUM('FACEBOOK','WEBSITE','REFERRAL','PHONE','WALK_IN','OTHER') NOT NULL DEFAULT 'OTHER';
ALTER TABLE `leads` MODIFY `status` ENUM('NEW','CONTACTED','QUALIFIED','LOST','CONVERTED','MEETING','SITE_VISIT','QUOTATION','NEGOTIATION','WON') NOT NULL DEFAULT 'NEW';
UPDATE `customers` c JOIN (SELECT convertedCustomerId, MIN(id) AS leadId FROM leads WHERE convertedCustomerId IS NOT NULL GROUP BY convertedCustomerId) x ON x.convertedCustomerId = c.id JOIN leads l ON l.id = x.leadId SET c.source = l.source;
ALTER TABLE `quotations` MODIFY `projectId` INTEGER NULL;
