-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: bei_finance_manager_local
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `bei_finance_manager_local`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `bei_finance_manager_local` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `bei_finance_manager_local`;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('08925f0f-daf7-4d30-a279-33c8bf3666db','93b86bbd175eab9fb51e52c353cb24ff8ed44317012e5cd20351e4c8b5c570d2','2026-09-24 03:26:35.224','20260901110953_add_purchase_item_received_quantity',NULL,NULL,'2026-09-24 03:26:35.215',1),('28d6dbcb-168c-4e3b-a599-ced9787ee152','8023f53b8a17b2758139e35197714df77d561959ddbec1ee0283120ed5e907ac','2026-09-24 03:26:35.285','20260904130410_add_customer_master',NULL,NULL,'2026-09-24 03:26:35.225',1),('426deb5d-3ef1-4dbd-af36-bd2b75f20535','f123784c988ceb627397634353b818b1d59c08009222d0651ee1ab77334a2549','2026-09-24 03:26:35.164','20260826183804_add_purchase_conversion_link',NULL,NULL,'2026-09-24 03:26:35.104',1),('47195b50-c7b0-4edd-9e5c-33f4a8211fb7','151ca2d87ec08493fc1fb2199a68d7ce7f757eb09cd97f3ed3e6e45e454133cf','2026-09-24 03:26:34.662','20260826102334_add_purchase_request',NULL,NULL,'2026-09-24 03:26:34.527',1),('4e96f61e-d98f-4003-b3f6-1e579bd03c66','b30303ab8d8fe1b4d6bc1c5743eb9b972144410648cc485e1afc569bb98665fc','2026-09-24 03:26:35.384','20260904200109_add_user_and_lead_foundation',NULL,NULL,'2026-09-24 03:26:35.286',1),('57f7c338-43e0-4068-9c7f-4fe8a5b6fb21','3c9893ef4dcc443dedd1e3c914bf7306c81a1c93713c9e36d6b01ca21be3adba','2026-09-24 03:26:34.525','20260825200739_add_boq',NULL,NULL,'2026-09-24 03:26:34.387',1),('7ddb9541-c633-4398-9e19-0700633fc3e4','ece89a42719a8b07f6e42f56e8dc569955c3b85428ef79344447a4e4d52941ea','2026-09-24 03:26:35.102','20260826121323_add_purchase_order',NULL,NULL,'2026-09-24 03:26:34.901',1),('7e0ec56c-ca3d-4f04-9002-6fa76534807f','ea546b2bb5b8b02761d395b1bfbb0f85a7077b873bad18cd8573ae20de165d0d','2026-09-24 03:26:34.859','20260826111226_add_rfq',NULL,NULL,'2026-09-24 03:26:34.664',1),('8d1283b0-f039-4a80-bb62-e4498d1ee2fc','258ded8962e680ee0dbc26ccd17bcf579d597acb9b46250ebba412bc091a40b7','2026-09-24 03:26:34.030','20260820070248_initial_setup',NULL,NULL,'2026-09-24 03:26:33.837',1),('8fc1400a-3f55-433a-a789-66f0f7db3244','48907fbfddc5b77973f762b65b006c960eb30fe0e77db881cb373e4a9d1e6e8e','2026-09-24 03:26:34.153','20260821172417_add_materials_and_vendor_prices',NULL,NULL,'2026-09-24 03:26:34.031',1),('a54d87e7-5c27-4255-bc28-fb4fe44e1d6b','cdeafcdd3e52106218993d2883a7aa8e13285ad6f6c88ca54ea2ba8a73435c60','2026-09-24 03:26:35.214','20260901085912_add_transaction_source',NULL,NULL,'2026-09-24 03:26:35.206',1),('ba1d0234-06fc-4bd5-a157-7dd988166cf4','63646cd634c17b9a2a5a80bd57a90ee24b64f6fc336fe31fecae1526aaee4f0a','2026-09-24 03:26:34.899','20260826115835_add_rfq_awarded_vendor',NULL,NULL,'2026-09-24 03:26:34.861',1),('dfcbdd59-833d-493e-8ddc-82254f8e7e89','c6f240759a10c8ffd337401af89cda9370a4ea9052df52f40f46b20aaa4fcaf0','2026-09-24 03:26:35.669','20260906185414_add_customer_quotations',NULL,NULL,'2026-09-24 03:26:35.385',1),('e10c7dbd-2c71-4a5b-90ed-0884a49fbcb0','a90401746ac8322c6e00ce4cde0ca1ed13e7b8726406c4ccc5795a0fc4362caa','2026-09-24 03:26:35.204','20260901072908_add_purchase_payments',NULL,NULL,'2026-09-24 03:26:35.166',1),('f05ff887-044a-4da1-b6b5-072803f69427','3b8018fbb68fada7528e2f93d5d7b2511e38a1398c047a9bfb150a108fbd45d7','2026-09-24 03:26:34.386','20260822202411_add_purchase_inventory',NULL,NULL,'2026-09-24 03:26:34.154',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `boq_items`
--

DROP TABLE IF EXISTS `boq_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `boq_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boqId` int(11) NOT NULL,
  `materialId` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `estimatedUnitPrice` decimal(15,2) NOT NULL DEFAULT 0.00,
  `estimatedTotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `boq_items_boqId_idx` (`boqId`),
  KEY `boq_items_materialId_idx` (`materialId`),
  CONSTRAINT `boq_items_boqId_fkey` FOREIGN KEY (`boqId`) REFERENCES `boqs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `boq_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `boq_items`
--

LOCK TABLES `boq_items` WRITE;
/*!40000 ALTER TABLE `boq_items` DISABLE KEYS */;
INSERT INTO `boq_items` VALUES (3,1,3,'de',1.000,'SQFT',200.00,200.00,NULL,'2026-08-26 08:50:15.601','2026-08-26 08:50:15.601'),(4,2,3,'hkhgh',5.000,'SQFT',2510.00,12550.00,NULL,'2026-08-26 08:52:28.201','2026-08-26 09:10:11.555'),(7,2,4,'cv',42.000,'SQFT',42.00,1764.00,NULL,'2026-08-26 10:07:07.698','2026-08-26 10:07:07.698'),(8,2,5,'fgfdg',454.000,'Piece',130.00,59020.00,NULL,'2026-08-26 10:07:17.661','2026-08-26 10:07:17.661'),(9,2,1,'Final BOQ validation test',10.000,'Sheet',3000.00,30000.00,'Test','2026-08-26 10:11:08.304','2026-09-08 16:32:35.100');
/*!40000 ALTER TABLE `boq_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `boqs`
--

DROP TABLE IF EXISTS `boqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `boqs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `boqNo` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `projectId` int(11) NOT NULL,
  `status` enum('DRAFT','FINAL','APPROVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `boqs_boqNo_key` (`boqNo`),
  KEY `boqs_projectId_idx` (`projectId`),
  KEY `boqs_status_idx` (`status`),
  CONSTRAINT `boqs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `boqs`
--

LOCK TABLES `boqs` WRITE;
/*!40000 ALTER TABLE `boqs` DISABLE KEYS */;
INSERT INTO `boqs` VALUES (1,'BOQ-0001','Test BOQ',5,'DRAFT','Phase 3 BOQ test','2026-08-25 20:29:33.441','2026-08-25 20:29:33.441'),(2,'BOQ-0002','1600 sqft Residential Interior Updated',5,'APPROVED','Updated BOQ test','2026-08-25 21:19:30.255','2026-08-28 06:10:06.895');
/*!40000 ALTER TABLE `boqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` enum('INCOME','EXPENSE') NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_type_key` (`name`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (3,'Client Payment','INCOME','ACTIVE','2026-08-20 09:57:46.323','2026-08-20 09:57:46.323'),(4,'Materials','EXPENSE','ACTIVE','2026-08-20 12:55:06.984','2026-08-20 12:55:06.984'),(5,'Carpanter','EXPENSE','ACTIVE','2026-08-20 17:43:31.331','2026-08-20 17:43:31.331'),(6,'Painter','EXPENSE','ACTIVE','2026-08-20 17:44:00.088','2026-08-20 17:44:00.088'),(16,'Comision g','INCOME','ACTIVE','2026-08-21 12:13:36.365','2026-08-25 19:25:06.808');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `companyName` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `customerType` enum('INDIVIDUAL','COMPANY') NOT NULL DEFAULT 'INDIVIDUAL',
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `customers_phone_idx` (`phone`),
  KEY `customers_status_idx` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (5,'Hossain Al Mahmud','01701058775','hoosain@gmail.com','Be interior','dhaka shonir akhra','COMPANY','ACTIVE','Test','2026-09-04 18:14:16.302','2026-09-04 19:08:29.325'),(7,'Ismail Hossain','01801058775','ismail@gmail.com',NULL,'aftabnagor','INDIVIDUAL','ACTIVE',NULL,'2026-09-04 19:08:05.309','2026-09-04 19:08:05.309'),(11,'tuhin choowdery','01829686850','tuhin@gmail.com',NULL,'test','INDIVIDUAL','ACTIVE',NULL,'2026-09-05 22:01:48.131','2026-09-05 22:01:48.131');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `leads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `companyName` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `source` enum('FACEBOOK','WEBSITE','REFERRAL','PHONE','WALK_IN','OTHER') NOT NULL DEFAULT 'OTHER',
  `status` enum('NEW','CONTACTED','QUALIFIED','LOST','CONVERTED') NOT NULL DEFAULT 'NEW',
  `notes` text DEFAULT NULL,
  `assignedToId` int(11) DEFAULT NULL,
  `convertedCustomerId` int(11) DEFAULT NULL,
  `convertedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `leads_phone_idx` (`phone`),
  KEY `leads_status_idx` (`status`),
  KEY `leads_source_idx` (`source`),
  KEY `leads_assignedToId_idx` (`assignedToId`),
  KEY `leads_convertedCustomerId_idx` (`convertedCustomerId`),
  CONSTRAINT `leads_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `leads_convertedCustomerId_fkey` FOREIGN KEY (`convertedCustomerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES (3,'tuhin choowdery','01829686850','tuhin@gmail.com',NULL,'test','FACEBOOK','CONVERTED',NULL,3,11,'2026-09-05 22:01:49.171','2026-09-05 21:39:01.648','2026-09-05 22:01:49.689');
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_categories`
--

DROP TABLE IF EXISTS `material_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `material_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_categories_name_key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_categories`
--

LOCK TABLES `material_categories` WRITE;
/*!40000 ALTER TABLE `material_categories` DISABLE KEYS */;
INSERT INTO `material_categories` VALUES (1,'Boards','MDF, HDF, Particle Board ECT','ACTIVE','2026-08-21 17:36:35.458','2026-08-22 17:38:54.547'),(3,'Hardwer','Sk Builder','ACTIVE','2026-08-22 17:01:43.364','2026-08-22 17:01:43.364'),(4,'Glass',NULL,'ACTIVE','2026-08-22 17:09:22.421','2026-08-22 17:09:22.421'),(5,'Door',NULL,'ACTIVE','2026-08-22 17:18:27.409','2026-08-22 17:18:27.409'),(6,'Sheet',NULL,'ACTIVE','2026-08-22 17:29:38.333','2026-08-22 17:29:38.333'),(7,'HPL',NULL,'ACTIVE','2026-08-22 17:29:43.404','2026-08-22 17:29:43.404');
/*!40000 ALTER TABLE `material_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `categoryId` int(11) DEFAULT NULL,
  `subCategory` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `modelCode` varchar(100) DEFAULT NULL,
  `specification` text DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `size` varchar(100) DEFAULT NULL,
  `unit` varchar(30) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `materials_code_key` (`code`),
  KEY `materials_categoryId_idx` (`categoryId`),
  KEY `materials_name_idx` (`name`),
  KEY `materials_brand_idx` (`brand`),
  CONSTRAINT `materials_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `material_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materials`
--

LOCK TABLES `materials` WRITE;
/*!40000 ALTER TABLE `materials` DISABLE KEYS */;
INSERT INTO `materials` VALUES (1,'MAT-0001','MDF Board 18mm',1,'MDF Board','Test Brand','MDF18','18mm MDF Board','Walnut','8x4 ft','Sheet','Test material for vendor price setup','ACTIVE','2026-08-21 17:51:06.661','2026-08-23 20:47:19.237'),(3,'G001','Glash Door 01',NULL,'Door','Nasir','N01','Nasir Glass','White','7x3','SQFT',NULL,'ACTIVE','2026-08-22 17:00:51.089','2026-08-23 20:49:30.745'),(4,'GTM-TBDG9PT4','Glass',4,'Door','Nasir','Regular DOor','10mm Temper Glass','White','8x4','SQFT',NULL,'ACTIVE','2026-08-23 13:13:27.671','2026-08-23 13:13:27.671'),(5,'G5','Hings',3,'Hatol','Hi Care','Half Baka','All SS',NULL,NULL,'Piece',NULL,'ACTIVE','2026-08-23 17:48:56.246','2026-08-23 17:48:56.246'),(6,'HPL-4609','HPL Sheet',7,'Sheet','Akij','4609MM','5mm HPL Sheet',NULL,'8x4','Piece',NULL,'ACTIVE','2026-08-24 03:32:52.653','2026-08-24 03:32:52.653');
/*!40000 ALTER TABLE `materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `contractValue` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `status` enum('ONGOING','COMPLETED','ON_HOLD') NOT NULL DEFAULT 'ONGOING',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `customerId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `projects_name_key` (`name`),
  KEY `projects_customerId_idx` (`customerId`),
  CONSTRAINT `projects_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,'Aftabnagar Residence Interior',1700000.00,'1600 sqft family residence interior project','COMPLETED','2026-08-20 08:03:47.284','2026-09-04 19:10:28.348',7),(2,'Banasree',500000.00,'Bangladesh','ONGOING','2026-08-20 08:27:10.730','2026-08-25 17:11:19.780',NULL),(3,'Gazaria Project',1000000.00,NULL,'ONGOING','2026-08-20 17:46:04.370','2026-08-20 17:46:04.370',NULL),(4,'Munshigonj',2000000.00,NULL,'ONGOING','2026-08-21 12:04:54.851','2026-08-21 12:04:54.851',NULL),(5,'01',500.00,NULL,'ONGOING','2026-08-21 12:08:46.703','2026-08-21 12:08:46.703',NULL),(6,'02',8555.00,NULL,'ONGOING','2026-08-21 12:08:54.673','2026-08-21 12:08:54.673',NULL),(7,'03',2000.00,NULL,'COMPLETED','2026-08-21 12:09:03.472','2026-08-21 12:09:03.472',NULL),(8,'05',2555.00,NULL,'ONGOING','2026-08-21 12:09:13.943','2026-08-21 12:09:13.943',NULL);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaseId` int(11) NOT NULL,
  `materialId` int(11) NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `unitPrice` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `receivedQuantity` decimal(15,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`id`),
  KEY `purchase_items_purchaseId_idx` (`purchaseId`),
  KEY `purchase_items_materialId_idx` (`materialId`),
  CONSTRAINT `purchase_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
INSERT INTO `purchase_items` VALUES (2,2,3,2.000,'SQFT',12500.00,25000.00,NULL,'2026-08-23 13:15:34.157','2026-09-01 20:28:24.527',2.000),(3,3,4,4.000,'SQFT',5000.00,20000.00,NULL,'2026-08-23 13:22:12.276','2026-09-01 20:28:24.976',4.000),(4,3,3,54.000,'SQFT',12500.00,675000.00,NULL,'2026-08-23 13:22:12.283','2026-09-01 20:28:25.418',54.000),(5,4,6,3.000,'Piece',2750.00,8250.00,NULL,'2026-08-24 03:33:51.398','2026-09-01 20:28:25.856',3.000),(9,5,1,20.000,'Sheet',1950.00,39000.00,NULL,'2026-08-24 16:19:45.230','2026-09-01 20:28:26.319',20.000),(12,1,1,10.000,'Sheet',3500.00,35000.00,'Test purchase','2026-08-25 17:10:45.555','2026-09-01 20:28:26.769',10.000),(14,17,3,10.000,'SQFT',232.00,2320.00,NULL,'2026-08-26 20:03:41.256','2026-09-01 20:28:27.210',10.000),(15,18,4,10.000,'SQFT',11.00,110.00,NULL,'2026-08-26 20:22:10.849','2026-09-01 20:28:27.662',10.000),(30,33,3,10.000,'SQFT',1111.00,11110.00,'pp','2026-08-30 16:48:52.454','2026-09-01 20:28:28.097',10.000),(35,16,1,25.000,'Sheet',2320.00,58000.00,'Status test item','2026-08-30 21:05:51.028','2026-09-01 20:28:28.544',25.000),(37,34,1,10.000,'Sheet',5800.00,58000.00,'BOQ requirement test','2026-08-31 20:45:53.209','2026-09-01 20:28:28.984',10.000);
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaseOrderId` int(11) NOT NULL,
  `materialId` int(11) NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `unitPrice` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_order_items_purchaseOrderId_idx` (`purchaseOrderId`),
  KEY `purchase_order_items_materialId_idx` (`materialId`),
  CONSTRAINT `purchase_order_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_order_items_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
INSERT INTO `purchase_order_items` VALUES (3,2,1,25.000,'Sheet',2320.00,58000.00,'Status test item','2026-08-26 18:16:24.072','2026-08-26 18:16:24.072'),(11,5,4,3.000,'SQFT',550.00,1650.00,NULL,'2026-08-29 06:22:21.073','2026-08-29 06:22:21.073'),(12,6,3,12.000,'SQFT',2000.00,24000.00,'fgf','2026-08-30 14:12:20.283','2026-08-30 14:12:20.283'),(15,7,3,10.000,'SQFT',1111.00,11110.00,'pp','2026-08-30 14:16:02.759','2026-08-30 14:16:02.759'),(17,8,3,100.000,'SQFT',1200.00,120000.00,NULL,'2026-08-30 20:30:08.864','2026-08-30 20:30:08.864'),(18,3,1,23.000,'Sheet',2320.00,53360.00,'Test','2026-08-30 20:31:54.998','2026-08-30 20:31:54.998'),(19,9,1,10.000,'Sheet',5800.00,58000.00,'BOQ requirement test','2026-08-31 20:34:46.391','2026-08-31 20:34:46.391'),(21,11,4,100.000,'SQFT',50.00,5000.00,NULL,'2026-09-01 06:30:39.529','2026-09-01 06:30:39.529');
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `poNo` varchar(50) NOT NULL,
  `poDate` datetime(3) NOT NULL,
  `vendorId` int(11) NOT NULL,
  `projectId` int(11) DEFAULT NULL,
  `rfqId` int(11) DEFAULT NULL,
  `status` enum('DRAFT','CONFIRMED','SENT','PARTIAL','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `transportCost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grandTotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `purchaseId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_orders_poNo_key` (`poNo`),
  UNIQUE KEY `purchase_orders_purchaseId_key` (`purchaseId`),
  KEY `purchase_orders_vendorId_idx` (`vendorId`),
  KEY `purchase_orders_projectId_idx` (`projectId`),
  KEY `purchase_orders_rfqId_idx` (`rfqId`),
  KEY `purchase_orders_status_idx` (`status`),
  KEY `purchase_orders_poDate_idx` (`poDate`),
  KEY `purchase_orders_purchaseId_idx` (`purchaseId`),
  CONSTRAINT `purchase_orders_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchase_orders_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
INSERT INTO `purchase_orders` VALUES (2,'PO-0002','2026-08-26 00:00:00.000',6,5,1,'COMPLETED',58000.00,0.00,0.00,58000.00,'Status workflow test','2026-08-26 18:16:24.072','2026-08-26 18:41:02.515',16),(3,'09','2026-08-29 00:00:00.000',14,4,5,'COMPLETED',53360.00,0.00,2000.00,55360.00,'all test','2026-08-29 06:00:22.133','2026-08-30 20:31:53.698',NULL),(5,'05','2026-08-29 00:00:00.000',6,6,1,'CANCELLED',1650.00,0.00,0.00,1650.00,NULL,'2026-08-29 06:22:21.073','2026-08-29 08:18:59.511',NULL),(6,'020','2026-08-30 00:00:00.000',6,7,1,'COMPLETED',24000.00,0.00,0.00,24000.00,NULL,'2026-08-30 14:12:20.283','2026-08-30 14:14:14.304',NULL),(7,'0111','2026-08-30 00:00:00.000',6,7,1,'COMPLETED',11110.00,0.00,0.00,11110.00,NULL,'2026-08-30 14:16:02.759','2026-08-30 16:48:56.013',33),(8,'PO-0003','2026-08-30 00:00:00.000',6,5,1,'COMPLETED',120000.00,0.00,0.00,120000.00,'RFQ-0001','2026-08-30 20:26:40.793','2026-08-31 21:23:51.651',NULL),(9,'PO-464212','2026-08-31 00:00:00.000',6,5,7,'COMPLETED',58000.00,0.00,0.00,58000.00,'Created from RFQ-151300','2026-08-31 20:34:46.391','2026-08-31 20:39:23.141',34),(11,'PO-TEST-001','2026-09-01 00:00:00.000',1,6,NULL,'DRAFT',5000.00,0.00,0.00,5000.00,NULL,'2026-09-01 06:30:39.529','2026-09-01 06:30:39.529',NULL);
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_payments`
--

DROP TABLE IF EXISTS `purchase_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaseId` int(11) NOT NULL,
  `paymentDate` datetime(3) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `paymentMethod` enum('CASH','BANK','MOBILE_BANKING','OTHER') NOT NULL DEFAULT 'CASH',
  `referenceNo` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_payments_purchaseId_idx` (`purchaseId`),
  KEY `purchase_payments_paymentDate_idx` (`paymentDate`),
  CONSTRAINT `purchase_payments_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `purchases` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_payments`
--

LOCK TABLES `purchase_payments` WRITE;
/*!40000 ALTER TABLE `purchase_payments` DISABLE KEYS */;
INSERT INTO `purchase_payments` VALUES (1,1,'2026-09-01 00:00:00.000',10000.00,'CASH','PAY-001','First vendor payment','2026-09-01 08:43:01.907','2026-09-01 08:43:01.907'),(2,1,'2026-09-01 00:00:00.000',25000.00,'BANK','PAY-002','Final vendor payment','2026-09-01 08:44:38.166','2026-09-01 08:44:38.166');
/*!40000 ALTER TABLE `purchase_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_request_items`
--

DROP TABLE IF EXISTS `purchase_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_request_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaseRequestId` int(11) NOT NULL,
  `materialId` int(11) NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `requiredDate` datetime(3) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_request_items_purchaseRequestId_idx` (`purchaseRequestId`),
  KEY `purchase_request_items_materialId_idx` (`materialId`),
  CONSTRAINT `purchase_request_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_request_items_purchaseRequestId_fkey` FOREIGN KEY (`purchaseRequestId`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_request_items`
--

LOCK TABLES `purchase_request_items` WRITE;
/*!40000 ALTER TABLE `purchase_request_items` DISABLE KEYS */;
INSERT INTO `purchase_request_items` VALUES (2,6,3,20.000,'500','2026-08-05 00:00:00.000',NULL,'2026-08-30 17:40:41.455','2026-08-30 17:40:41.455'),(4,7,1,10.000,'Sheet','2026-09-05 00:00:00.000','BOQ requirement test','2026-08-31 17:36:14.614','2026-08-31 18:11:12.872');
/*!40000 ALTER TABLE `purchase_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_requests`
--

DROP TABLE IF EXISTS `purchase_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requestNo` varchar(50) NOT NULL,
  `requestDate` datetime(3) NOT NULL,
  `projectId` int(11) NOT NULL,
  `status` enum('DRAFT','PENDING','APPROVED','REJECTED','CONVERTED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `priority` enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_requests_requestNo_key` (`requestNo`),
  KEY `purchase_requests_projectId_idx` (`projectId`),
  KEY `purchase_requests_status_idx` (`status`),
  KEY `purchase_requests_requestDate_idx` (`requestDate`),
  CONSTRAINT `purchase_requests_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_requests`
--

LOCK TABLES `purchase_requests` WRITE;
/*!40000 ALTER TABLE `purchase_requests` DISABLE KEYS */;
INSERT INTO `purchase_requests` VALUES (4,'gfg','2026-08-26 00:00:00.000',5,'PENDING','HIGH','fff','2026-08-26 20:03:59.125','2026-08-28 05:30:10.544'),(5,'fdf','2026-08-26 00:00:00.000',8,'DRAFT','HIGH',NULL,'2026-08-26 20:15:36.882','2026-08-26 20:15:36.882'),(6,'sdfsdf','2026-08-26 00:00:00.000',6,'DRAFT','URGENT',NULL,'2026-08-26 20:21:52.115','2026-08-30 18:03:19.988'),(7,'PR-0002','2026-08-31 00:00:00.000',5,'CONVERTED','HIGH',NULL,'2026-08-31 17:36:10.094','2026-08-31 18:49:16.786');
/*!40000 ALTER TABLE `purchase_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaseNo` varchar(50) NOT NULL,
  `purchaseDate` datetime(3) NOT NULL,
  `vendorId` int(11) NOT NULL,
  `projectId` int(11) DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `transportCost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grandTotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paymentStatus` enum('UNPAID','PARTIAL','PAID') NOT NULL DEFAULT 'UNPAID',
  `paidAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `dueAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchases_purchaseNo_key` (`purchaseNo`),
  KEY `purchases_purchaseDate_idx` (`purchaseDate`),
  KEY `purchases_vendorId_idx` (`vendorId`),
  KEY `purchases_projectId_idx` (`projectId`),
  KEY `purchases_paymentStatus_idx` (`paymentStatus`),
  CONSTRAINT `purchases_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `purchases_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES (1,'PO-0001','2026-08-23 00:00:00.000',1,2,35000.00,0.00,0.00,35000.00,'PAID',35000.00,0.00,'Purchase API test','2026-08-22 20:38:55.441','2026-09-01 08:44:40.008'),(2,'G01','2026-08-10 00:00:00.000',6,4,25000.00,0.00,2500.00,27500.00,'PARTIAL',20000.00,7500.00,NULL,'2026-08-23 13:15:34.149','2026-08-23 13:15:34.149'),(3,'P03','2026-08-23 00:00:00.000',6,3,695000.00,50000.00,15000.00,660000.00,'PARTIAL',400000.00,260000.00,NULL,'2026-08-23 13:22:12.269','2026-08-23 13:22:12.269'),(4,'7262','2026-08-24 00:00:00.000',14,4,8250.00,0.00,1200.00,9450.00,'PAID',9450.00,0.00,NULL,'2026-08-24 03:33:51.392','2026-08-24 03:33:51.392'),(5,'0','2026-08-24 00:00:00.000',1,4,39000.00,0.00,500.00,39500.00,'PARTIAL',34000.00,5500.00,NULL,'2026-08-24 04:15:08.815','2026-08-24 16:19:45.222'),(16,'PO-0002','2026-08-26 00:00:00.000',6,5,58000.00,0.00,0.00,58000.00,'PAID',58000.00,0.00,'Status workflow test','2026-08-26 18:41:02.484','2026-08-30 21:05:49.218'),(17,'fgf','2026-07-31 00:00:00.000',14,8,2320.00,0.00,200.00,2520.00,'PARTIAL',500.00,2020.00,NULL,'2026-08-26 20:03:41.247','2026-08-26 20:03:41.247'),(18,'cvcxv','2026-08-26 00:00:00.000',14,6,110.00,0.00,0.00,110.00,'UNPAID',0.00,110.00,NULL,'2026-08-26 20:22:10.844','2026-08-26 20:22:10.844'),(33,'0111','2026-08-30 00:00:00.000',6,7,11110.00,0.00,0.00,11110.00,'UNPAID',0.00,11110.00,'Converted from 0111','2026-08-30 16:48:51.593','2026-08-30 16:48:51.593'),(34,'PO-464212','2026-08-31 00:00:00.000',6,5,58000.00,0.00,0.00,58000.00,'PARTIAL',10000.00,48000.00,'Created from RFQ-151300','2026-08-31 20:39:18.569','2026-08-31 20:45:51.306');
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quotation_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quotationId` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `specification` text DEFAULT NULL,
  `pricingType` enum('UNIT_PRICE','FIXED_AMOUNT') NOT NULL DEFAULT 'UNIT_PRICE',
  `quantity` decimal(15,3) DEFAULT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `unitPrice` decimal(15,2) DEFAULT NULL,
  `lineTotal` decimal(15,2) NOT NULL,
  `materialId` int(11) DEFAULT NULL,
  `boqItemId` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `quotation_items_quotationId_idx` (`quotationId`),
  KEY `quotation_items_materialId_idx` (`materialId`),
  KEY `quotation_items_boqItemId_idx` (`boqItemId`),
  KEY `quotation_items_pricingType_idx` (`pricingType`),
  CONSTRAINT `quotation_items_boqItemId_fkey` FOREIGN KEY (`boqItemId`) REFERENCES `boq_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `quotation_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `quotation_items_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
INSERT INTO `quotation_items` VALUES (1,1,'Drawing Room Ceiling','12mm white Plain Particle Board; Plastic Paint; 2x1 Gorjon wood frame; Spot light; Raw material; Fitting and fixing','UNIT_PRICE',348.000,'SQFT',550.00,191400.00,NULL,NULL,NULL,1,'2026-09-06 19:18:26.717','2026-09-06 19:18:26.717'),(2,1,'Complete Kitchen Interior Package','18mm Gorjon ply board; HPL & liner; Glass; Premium hardware; Metal frame; 6mm plywood; Fitting and fixing','FIXED_AMOUNT',NULL,NULL,NULL,350000.00,NULL,NULL,NULL,2,'2026-09-06 19:19:15.243','2026-09-06 19:19:15.243'),(5,2,'Drawing Room Ceiling',NULL,'UNIT_PRICE',348.000,'SQFT',600.00,208800.00,NULL,NULL,'a',1,'2026-09-07 20:56:49.677','2026-09-07 20:56:49.677');
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_payment_milestones`
--

DROP TABLE IF EXISTS `quotation_payment_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quotation_payment_milestones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quotationId` int(11) NOT NULL,
  `milestoneNo` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `percentage` decimal(8,3) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `dueTrigger` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `quotation_payment_milestones_quotationId_idx` (`quotationId`),
  CONSTRAINT `quotation_payment_milestones_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_payment_milestones`
--

LOCK TABLES `quotation_payment_milestones` WRITE;
/*!40000 ALTER TABLE `quotation_payment_milestones` DISABLE KEYS */;
INSERT INTO `quotation_payment_milestones` VALUES (1,1,1,'Work Order',50.000,263200.00,'At work order confirmation',NULL,1,'2026-09-06 19:48:47.560','2026-09-06 19:48:47.560'),(2,1,2,'50% Work Complete',20.000,105280.00,'After completing 50% of the work',NULL,2,'2026-09-06 19:49:45.709','2026-09-06 19:49:45.709'),(3,1,3,'80% Work Complete',20.000,105280.00,'After completing 80% of the work',NULL,3,'2026-09-06 19:50:28.522','2026-09-06 19:50:28.522'),(5,1,4,'Project Final Handover',10.000,52640.00,'After complete project handover',NULL,4,'2026-09-06 19:58:55.048','2026-09-06 19:58:55.048'),(6,2,1,'Work Order',50.000,98658.00,'At work order confirmation',NULL,1,'2026-09-07 21:34:44.290','2026-09-07 21:34:44.290'),(7,2,2,'50% Work Complete',20.000,39463.20,'After completing 50% of the work',NULL,2,'2026-09-07 21:39:37.280','2026-09-07 21:39:37.280'),(9,2,3,'Project Completion',30.000,59194.80,'After project handover',NULL,3,'2026-09-07 22:21:54.384','2026-09-07 22:21:54.384');
/*!40000 ALTER TABLE `quotation_payment_milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotations`
--

DROP TABLE IF EXISTS `quotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quotations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quotationNo` varchar(50) NOT NULL,
  `customerId` int(11) NOT NULL,
  `projectId` int(11) NOT NULL,
  `quotationDate` datetime(3) NOT NULL,
  `validUntil` datetime(3) DEFAULT NULL,
  `status` enum('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `revisionNo` int(11) NOT NULL DEFAULT 1,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discountType` enum('PERCENT','FIXED') DEFAULT NULL,
  `discountValue` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discountAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `taxType` enum('PERCENT','FIXED') DEFAULT NULL,
  `taxRate` decimal(8,3) NOT NULL DEFAULT 0.000,
  `taxAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `grandTotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paymentTerms` text DEFAULT NULL,
  `termsAndConditions` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotations_quotationNo_key` (`quotationNo`),
  KEY `quotations_customerId_idx` (`customerId`),
  KEY `quotations_projectId_idx` (`projectId`),
  KEY `quotations_status_idx` (`status`),
  KEY `quotations_quotationDate_idx` (`quotationDate`),
  CONSTRAINT `quotations_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `quotations_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotations`
--

LOCK TABLES `quotations` WRITE;
/*!40000 ALTER TABLE `quotations` DISABLE KEYS */;
INSERT INTO `quotations` VALUES (1,'TEST-QT-0001',7,1,'2026-09-07 00:00:00.000','2026-10-17 00:00:00.000','SENT',1,541400.00,'FIXED',25000.00,25000.00,'FIXED',10000.000,10000.00,526400.00,'50% advance with work order.','Temporary API runtime test quotation.','TEST ONLY','2026-09-06 19:10:41.547','2026-09-06 20:11:12.520'),(2,'QT-0002',7,1,'2026-09-07 00:00:00.000','2026-10-17 00:00:00.000','SENT',1,208800.00,'PERCENT',10.00,20880.00,'PERCENT',5.000,9396.00,197316.00,NULL,NULL,NULL,'2026-09-07 18:54:04.152','2026-09-07 22:22:33.838');
/*!40000 ALTER TABLE `quotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rfq_items`
--

DROP TABLE IF EXISTS `rfq_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rfq_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rfqId` int(11) NOT NULL,
  `materialId` int(11) NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `rfq_items_rfqId_idx` (`rfqId`),
  KEY `rfq_items_materialId_idx` (`materialId`),
  CONSTRAINT `rfq_items_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `rfq_items_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rfq_items`
--

LOCK TABLES `rfq_items` WRITE;
/*!40000 ALTER TABLE `rfq_items` DISABLE KEYS */;
INSERT INTO `rfq_items` VALUES (2,1,1,25.000,'Sheet','PO test item','2026-08-26 15:20:44.933','2026-08-26 15:20:44.933'),(4,5,3,12.000,'SQFT','test update','2026-08-30 18:58:17.038','2026-08-30 18:59:54.026'),(5,6,1,100.000,'sheet','test 002','2026-08-30 19:59:47.105','2026-08-30 19:59:47.105'),(6,7,1,10.000,'Sheet','BOQ requirement test','2026-08-31 18:49:15.406','2026-08-31 18:49:15.406'),(7,4,5,10.000,'300','test','2026-09-08 16:36:44.031','2026-09-08 16:36:44.031');
/*!40000 ALTER TABLE `rfq_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rfq_vendors`
--

DROP TABLE IF EXISTS `rfq_vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rfq_vendors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rfqId` int(11) NOT NULL,
  `vendorId` int(11) NOT NULL,
  `quotedTotal` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfq_vendors_rfqId_vendorId_key` (`rfqId`,`vendorId`),
  KEY `rfq_vendors_rfqId_idx` (`rfqId`),
  KEY `rfq_vendors_vendorId_idx` (`vendorId`),
  CONSTRAINT `rfq_vendors_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `rfq_vendors_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rfq_vendors`
--

LOCK TABLES `rfq_vendors` WRITE;
/*!40000 ALTER TABLE `rfq_vendors` DISABLE KEYS */;
INSERT INTO `rfq_vendors` VALUES (2,1,1,60000.00,'Vendor A quote','2026-08-26 11:44:30.903','2026-08-26 11:44:30.903'),(3,1,6,58000.00,'Vendor B quote','2026-08-26 11:47:54.995','2026-08-26 11:47:54.995'),(4,5,14,550000.00,'Vendor quotation test - updated','2026-08-30 19:16:24.130','2026-08-30 19:28:29.045'),(5,6,1,50000.00,'test002','2026-08-30 20:00:07.047','2026-08-30 20:00:07.047'),(6,7,1,60000.00,'Vendor A quotation','2026-08-31 19:22:00.984','2026-08-31 19:22:00.984'),(7,7,6,58000.00,'Vendor B quotation','2026-08-31 19:23:19.505','2026-08-31 19:23:19.505'),(8,4,1,10000.00,'test','2026-09-08 16:37:14.272','2026-09-08 16:37:14.272');
/*!40000 ALTER TABLE `rfq_vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rfqs`
--

DROP TABLE IF EXISTS `rfqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rfqs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rfqNo` varchar(50) NOT NULL,
  `rfqDate` datetime(3) NOT NULL,
  `projectId` int(11) NOT NULL,
  `status` enum('DRAFT','SENT','QUOTED','EVALUATED','AWARDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `awardedVendorId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfqs_rfqNo_key` (`rfqNo`),
  KEY `rfqs_projectId_idx` (`projectId`),
  KEY `rfqs_status_idx` (`status`),
  KEY `rfqs_rfqDate_idx` (`rfqDate`),
  KEY `rfqs_awardedVendorId_fkey` (`awardedVendorId`),
  CONSTRAINT `rfqs_awardedVendorId_fkey` FOREIGN KEY (`awardedVendorId`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `rfqs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rfqs`
--

LOCK TABLES `rfqs` WRITE;
/*!40000 ALTER TABLE `rfqs` DISABLE KEYS */;
INSERT INTO `rfqs` VALUES (1,'RFQ-0001','2026-08-26 00:00:00.000',5,'AWARDED','RFQ for project 01-test','2026-08-26 11:25:51.115','2026-08-30 18:09:27.411',6),(4,'07','2026-08-29 00:00:00.000',4,'AWARDED','ddd','2026-08-29 06:01:03.849','2026-09-08 16:37:26.851',NULL),(5,'TEST-001','2026-08-30 00:00:00.000',6,'AWARDED','RFQ create test','2026-08-30 18:12:17.893','2026-08-30 19:58:11.274',14),(6,'test 0002','2026-08-30 00:00:00.000',5,'AWARDED','teast 002','2026-08-30 19:59:13.499','2026-08-30 20:01:11.221',1),(7,'RFQ-151300','2026-08-31 00:00:00.000',5,'AWARDED','Created from Purchase Request PR-0002','2026-08-31 18:49:14.502','2026-09-08 16:35:53.935',1);
/*!40000 ALTER TABLE `rfqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `materialId` int(11) NOT NULL,
  `movementType` enum('PURCHASE','PROJECT_USAGE','RETURN','DAMAGE','ADJUSTMENT') NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `referenceType` varchar(50) DEFAULT NULL,
  `referenceId` int(11) DEFAULT NULL,
  `projectId` int(11) DEFAULT NULL,
  `unitCost` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `movementDate` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `stock_movements_materialId_idx` (`materialId`),
  KEY `stock_movements_movementType_idx` (`movementType`),
  KEY `stock_movements_movementDate_idx` (`movementDate`),
  KEY `stock_movements_projectId_idx` (`projectId`),
  CONSTRAINT `stock_movements_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_movements_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (2,3,'PURCHASE',2.000,'SQFT','PURCHASE',2,4,12500.00,'Purchase G01','2026-08-23 13:15:34.160','2026-08-23 13:15:34.160'),(3,4,'PURCHASE',4.000,'SQFT','PURCHASE',3,3,5000.00,'Purchase P03','2026-08-23 13:22:12.279','2026-08-23 13:22:12.279'),(4,3,'PURCHASE',54.000,'SQFT','PURCHASE',3,3,12500.00,'Purchase P03','2026-08-23 13:22:12.286','2026-08-23 13:22:12.286'),(5,6,'PURCHASE',3.000,'Piece','PURCHASE',4,4,2750.00,'Purchase 7262','2026-08-24 03:33:51.401','2026-08-24 03:33:51.401'),(7,6,'PROJECT_USAGE',1.000,'Piece','PROJECT_USAGE',NULL,NULL,NULL,'Stock usage test','2026-08-24 04:27:36.107','2026-08-24 04:27:36.107'),(8,3,'PROJECT_USAGE',2.000,'SQFT','PROJECT_USAGE',NULL,4,NULL,'fff','2026-08-24 10:49:05.721','2026-08-24 10:49:05.721'),(9,6,'PROJECT_USAGE',1.000,'Piece','PROJECT_USAGE',NULL,3,NULL,NULL,'2026-08-24 10:51:32.309','2026-08-24 10:51:32.309'),(10,1,'PROJECT_USAGE',12.000,'Sheet','PROJECT_USAGE',NULL,4,NULL,'MDF BOard Dilam','2026-08-24 12:20:49.205','2026-08-24 12:20:49.205'),(11,6,'RETURN',1.000,'Piece','STOCK_RETURN',NULL,NULL,NULL,'Stock return test','2026-08-24 13:04:27.691','2026-08-24 13:04:27.691'),(12,6,'DAMAGE',1.000,'Piece','STOCK_DAMAGE',NULL,NULL,NULL,'Damage test','2026-08-24 13:12:30.723','2026-08-24 13:12:30.723'),(13,6,'ADJUSTMENT',2.000,'Piece','STOCK_ADJUSTMENT',NULL,NULL,NULL,'Stock adjustment test','2026-08-24 13:16:18.284','2026-08-24 13:16:18.284'),(14,6,'ADJUSTMENT',-2.000,'Piece','STOCK_ADJUSTMENT',NULL,NULL,NULL,'Negative adjustment test','2026-08-24 13:18:09.284','2026-08-24 13:18:09.284'),(15,1,'RETURN',5.000,'Sheet','STOCK_RETURN',NULL,NULL,NULL,NULL,'2026-08-24 13:35:47.858','2026-08-24 13:35:47.858'),(16,6,'RETURN',1.000,'Piece','STOCK_RETURN',NULL,NULL,NULL,'UI return test','2026-08-24 13:42:26.911','2026-08-24 13:42:26.911'),(17,1,'DAMAGE',3.000,'Sheet','STOCK_DAMAGE',NULL,NULL,NULL,'Broken test','2026-08-24 13:55:37.153','2026-08-24 13:55:37.153'),(18,1,'ADJUSTMENT',3.000,'Sheet','STOCK_ADJUSTMENT',NULL,NULL,NULL,NULL,'2026-08-24 14:08:52.504','2026-08-24 14:08:52.504'),(19,1,'ADJUSTMENT',-5.000,'Sheet','STOCK_ADJUSTMENT',NULL,NULL,NULL,NULL,'2026-08-24 14:09:01.623','2026-08-24 14:09:01.623'),(20,1,'ADJUSTMENT',3.000,'Sheet','STOCK_ADJUSTMENT',NULL,NULL,NULL,NULL,'2026-08-24 14:09:09.726','2026-08-24 14:09:09.726'),(21,6,'ADJUSTMENT',2.000,'Piece','STOCK_ADJUSTMENT',NULL,NULL,NULL,'Physical stock correction test','2026-08-24 14:10:15.919','2026-08-24 14:10:15.919'),(22,6,'ADJUSTMENT',-1.000,'Piece','STOCK_ADJUSTMENT',NULL,NULL,NULL,NULL,'2026-08-24 14:11:22.350','2026-08-24 14:11:22.350'),(25,1,'PURCHASE',20.000,'Sheet','PURCHASE',5,4,1950.00,'Purchase 0','2026-08-24 16:19:45.235','2026-08-24 16:19:45.235'),(28,1,'PURCHASE',10.000,'Sheet','PURCHASE',1,2,3500.00,'Purchase PO-0001','2026-08-25 17:10:45.559','2026-08-25 17:10:45.559'),(30,3,'PURCHASE',10.000,'SQFT','PURCHASE',17,8,232.00,'Purchase fgf','2026-08-26 20:03:41.262','2026-08-26 20:03:41.262'),(31,4,'PURCHASE',10.000,'SQFT','PURCHASE',18,6,11.00,'Purchase cvcxv','2026-08-26 20:22:10.852','2026-08-26 20:22:10.852'),(46,3,'PURCHASE',10.000,'SQFT','PURCHASE',33,7,1111.00,'Purchase 0111','2026-08-30 16:48:53.341','2026-08-30 16:48:53.341'),(51,1,'PURCHASE',25.000,'Sheet','PURCHASE',16,5,2320.00,'Purchase PO-0002','2026-08-30 21:05:51.938','2026-08-30 21:05:51.938'),(53,1,'PURCHASE',10.000,'Sheet','PURCHASE',34,5,5800.00,'Purchase PO-464212','2026-08-31 20:45:54.136','2026-08-31 20:45:54.136'),(59,1,'RETURN',5.000,'Sheet','STOCK_RETURN',NULL,4,NULL,'Phase 5 Project Return Test','2026-09-04 06:26:38.134','2026-09-04 06:26:38.134');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transactionDate` datetime(3) NOT NULL,
  `type` enum('INCOME','EXPENSE') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `paymentMethod` enum('CASH','BANK','MOBILE_BANKING','OTHER') NOT NULL DEFAULT 'CASH',
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `projectId` int(11) DEFAULT NULL,
  `categoryId` int(11) DEFAULT NULL,
  `workerId` int(11) DEFAULT NULL,
  `vendorId` int(11) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `source` enum('MANUAL','PURCHASE','PURCHASE_PAYMENT') NOT NULL DEFAULT 'MANUAL',
  PRIMARY KEY (`id`),
  KEY `transactions_transactionDate_idx` (`transactionDate`),
  KEY `transactions_type_idx` (`type`),
  KEY `transactions_projectId_idx` (`projectId`),
  KEY `transactions_categoryId_fkey` (`categoryId`),
  KEY `transactions_workerId_fkey` (`workerId`),
  KEY `transactions_vendorId_fkey` (`vendorId`),
  CONSTRAINT `transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_workerId_fkey` FOREIGN KEY (`workerId`) REFERENCES `workers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (4,'2026-08-20 00:00:00.000','EXPENSE',8000.00,'CASH','gh','pay',1,4,2,NULL,'2026-08-20 13:06:57.480','2026-08-20 16:47:40.061','MANUAL'),(6,'2026-08-20 00:00:00.000','EXPENSE',12000.00,'CASH','Pay',NULL,2,5,1,NULL,'2026-08-20 14:19:11.506','2026-08-20 18:57:01.151','MANUAL'),(7,'2026-08-20 00:00:00.000','EXPENSE',5200.00,'CASH','Board',NULL,1,4,NULL,1,'2026-08-20 17:10:22.420','2026-08-20 17:10:22.420','MANUAL'),(8,'2026-08-20 00:00:00.000','INCOME',5001.00,'CASH','Pay first payment','Gazaria Project',1,NULL,NULL,NULL,'2026-08-20 17:45:17.668','2026-08-23 19:38:29.952','MANUAL'),(10,'2026-08-20 00:00:00.000','EXPENSE',50000.00,'CASH','fdfffff dff',NULL,2,5,1,NULL,'2026-08-20 20:09:32.027','2026-08-20 20:09:32.027','MANUAL'),(11,'2026-08-21 00:00:00.000','EXPENSE',5000.00,'CASH','fgggg','gg',2,6,2,NULL,'2026-08-21 12:03:22.411','2026-08-21 12:03:22.411','MANUAL'),(12,'2026-08-21 00:00:00.000','EXPENSE',25000.00,'CASH','yuuuuuu','uuu',3,4,NULL,1,'2026-08-21 12:03:44.345','2026-08-21 12:03:44.345','MANUAL'),(13,'2026-08-21 00:00:00.000','INCOME',5000003.00,'BANK','Advance',NULL,2,NULL,NULL,NULL,'2026-08-21 12:04:19.513','2026-08-25 19:18:35.841','MANUAL'),(14,'2026-08-21 00:00:00.000','EXPENSE',20000.00,'CASH','Nmknjlkhik','ffffffffffffff',4,5,1,NULL,'2026-08-21 12:05:23.337','2026-08-21 12:05:23.337','MANUAL'),(15,'2026-08-21 00:00:00.000','EXPENSE',65825.00,'CASH','ffffff',NULL,3,6,2,NULL,'2026-08-21 12:05:49.634','2026-08-21 13:03:43.228','MANUAL'),(16,'2026-08-21 00:00:00.000','EXPENSE',68525.00,'CASH',NULL,NULL,4,4,NULL,1,'2026-08-21 12:06:03.160','2026-08-21 12:06:03.160','MANUAL'),(17,'2026-08-21 00:00:00.000','EXPENSE',66888.00,'MOBILE_BANKING','tttttttttt',NULL,4,6,2,NULL,'2026-08-21 12:06:25.257','2026-08-21 12:06:25.257','MANUAL'),(21,'2026-08-21 00:00:00.000','INCOME',68000.00,'MOBILE_BANKING',NULL,NULL,4,6,NULL,NULL,'2026-08-21 12:07:36.385','2026-08-25 19:20:24.880','MANUAL'),(23,'2026-08-21 00:00:00.000','INCOME',36000.00,'CASH',NULL,NULL,3,NULL,NULL,NULL,'2026-08-21 12:07:55.368','2026-08-21 12:07:55.368','MANUAL'),(24,'2026-08-21 00:00:00.000','INCOME',36000.00,'CASH',NULL,NULL,2,NULL,NULL,NULL,'2026-08-21 12:08:06.383','2026-08-21 12:08:06.383','MANUAL'),(25,'2026-08-21 00:00:00.000','INCOME',8222.00,'CASH',NULL,NULL,4,NULL,NULL,NULL,'2026-08-21 12:08:12.215','2026-08-21 12:08:12.215','MANUAL'),(28,'2026-08-23 00:00:00.000','EXPENSE',8771.00,'MOBILE_BANKING','First Pay',NULL,2,5,1,NULL,'2026-08-23 18:48:03.150','2026-08-23 19:02:52.704','MANUAL'),(30,'2026-08-24 00:00:00.000','INCOME',1000.00,'CASH',NULL,NULL,4,16,NULL,NULL,'2026-08-24 04:03:15.127','2026-08-25 19:18:23.796','MANUAL'),(31,'2026-08-24 00:00:00.000','EXPENSE',1000.00,'CASH',NULL,NULL,2,5,1,NULL,'2026-08-24 04:03:57.882','2026-08-25 19:24:34.610','MANUAL'),(33,'2026-08-23 00:00:00.000','EXPENSE',35000.00,'OTHER','Material Purchase - PO-0001','Purchase API test',2,4,NULL,1,'2026-08-24 16:19:45.246','2026-09-01 09:26:18.070','PURCHASE'),(38,'2026-08-25 00:00:00.000','INCOME',100.00,'CASH','INCOME TEST','INCOME TEST',7,5,NULL,NULL,'2026-08-25 19:38:16.088','2026-08-25 19:38:16.088','MANUAL'),(39,'2026-08-25 00:00:00.000','INCOME',108.00,'CASH',NULL,'INCOME TEST',NULL,NULL,NULL,NULL,'2026-08-25 19:39:05.032','2026-08-25 19:39:05.032','MANUAL'),(40,'2026-08-25 00:00:00.000','INCOME',2540.00,'CASH',NULL,'gh',8,5,NULL,NULL,'2026-08-25 19:49:48.056','2026-08-25 19:50:01.426','MANUAL'),(41,'2026-08-25 00:00:00.000','INCOME',8588.00,'CASH',NULL,NULL,8,16,NULL,NULL,'2026-08-25 19:56:11.536','2026-08-25 19:56:11.536','MANUAL'),(42,'2026-08-25 00:00:00.000','INCOME',2.00,'CASH',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-25 19:57:09.289','2026-08-25 19:57:09.289','MANUAL'),(43,'2026-08-26 00:00:00.000','EXPENSE',58000.00,'OTHER','Material Purchase - PO-0002','Status workflow test',5,4,NULL,6,'2026-08-26 18:41:02.506','2026-09-01 09:26:18.070','PURCHASE'),(44,'2026-07-31 00:00:00.000','EXPENSE',2520.00,'OTHER','Material Purchase - fgf','Purchase fgf',8,4,NULL,14,'2026-08-26 20:03:41.265','2026-09-01 09:26:18.070','PURCHASE'),(45,'2026-08-26 00:00:00.000','EXPENSE',110.00,'OTHER','Material Purchase - cvcxv','Purchase cvcxv',6,4,NULL,14,'2026-08-26 20:22:10.855','2026-09-01 09:26:18.070','PURCHASE'),(61,'2026-08-31 00:00:00.000','EXPENSE',58000.00,'OTHER','Material Purchase - PO-464212','Created from RFQ-151300',5,4,NULL,6,'2026-08-31 20:39:21.804','2026-09-01 09:26:18.070','PURCHASE'),(62,'2026-09-01 00:00:00.000','EXPENSE',10000.00,'CASH','Vendor Payment - PO-0001','First vendor payment',2,4,NULL,1,'2026-09-01 08:43:05.802','2026-09-01 09:26:18.570','PURCHASE_PAYMENT'),(63,'2026-09-01 00:00:00.000','EXPENSE',25000.00,'BANK','Vendor Payment - PO-0001','Final vendor payment',2,4,NULL,1,'2026-09-01 08:44:41.958','2026-09-01 09:26:18.570','PURCHASE_PAYMENT');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  KEY `users_status_idx` (`status`),
  KEY `users_phone_idx` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (3,'Hossain Al Mahmud','hossain',NULL,NULL,'$2b$12$NwO3bXuNn5UCEZRnNHQw7.jjV5IdcT4md8SZbSuXwbUUDn164/GXa','ACTIVE','2026-09-05 20:33:53.925','2026-09-05 20:33:53.925');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendor_material_prices`
--

DROP TABLE IF EXISTS `vendor_material_prices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendor_material_prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `materialId` int(11) NOT NULL,
  `vendorId` int(11) NOT NULL,
  `unitPrice` decimal(15,2) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `minimumQty` decimal(15,2) DEFAULT NULL,
  `leadTimeDays` int(11) DEFAULT NULL,
  `effectiveDate` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `notes` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `vendor_material_prices_materialId_idx` (`materialId`),
  KEY `vendor_material_prices_vendorId_idx` (`vendorId`),
  KEY `vendor_material_prices_materialId_vendorId_idx` (`materialId`,`vendorId`),
  KEY `vendor_material_prices_effectiveDate_idx` (`effectiveDate`),
  CONSTRAINT `vendor_material_prices_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `materials` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `vendor_material_prices_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendor_material_prices`
--

LOCK TABLES `vendor_material_prices` WRITE;
/*!40000 ALTER TABLE `vendor_material_prices` DISABLE KEYS */;
INSERT INTO `vendor_material_prices` VALUES (6,1,14,3300.00,'Sheet',12.00,2,'2026-08-24 13:08:11.602',NULL,'2026-08-24 13:08:11.603','2026-08-24 13:08:31.255'),(7,1,6,3100.00,'Sheet',5.00,2,'2026-08-25 18:12:20.760','Phase 2 test','2026-08-25 18:12:20.762','2026-08-25 18:39:07.389'),(8,5,14,3000.00,'Piece',54.00,2,'2026-08-25 19:10:54.583','fdgfg','2026-08-25 19:10:54.586','2026-08-25 19:10:54.586'),(9,5,1,4000.00,'Piece',54.00,2,'2026-08-25 19:11:14.357','ldfjnslkfj asfjlkasdj','2026-08-25 19:11:14.359','2026-08-25 19:11:23.665'),(11,5,6,3452.00,'Piece',54.00,5,'2026-08-25 19:12:30.776',NULL,'2026-08-25 19:12:30.779','2026-08-25 19:12:30.779');
/*!40000 ALTER TABLE `vendor_material_prices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `companyName` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES (1,'Foysal','Sonali Partical','01789527155','Khilgao Flyover birig er niche','ACTIVE','2026-08-20 17:09:24.703','2026-08-20 17:09:24.703'),(6,'Razib gh','Rb THai and Glass','01701058775','H-54, 2nd Floor, Bank Tower, Jia Soroni Titas Gas Road,Shonir Akhra,Dhaka-1236','ACTIVE','2026-08-21 12:11:32.038','2026-08-25 19:24:51.738'),(14,'Abir Rahman','Le Materia','01321146762','shop 6','ACTIVE','2026-08-24 03:28:58.268','2026-08-24 03:28:58.268');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workers`
--

DROP TABLE IF EXISTS `workers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `role` varchar(100) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workers`
--

LOCK TABLES `workers` WRITE;
/*!40000 ALTER TABLE `workers` DISABLE KEYS */;
INSERT INTO `workers` VALUES (1,'Razzak','01733568090','Carpenter','ACTIVE','2026-08-20 16:45:18.892','2026-08-20 16:45:18.892'),(2,'Shipon','01969890034','Painter','ACTIVE','2026-08-20 16:46:10.800','2026-08-20 16:46:10.800'),(5,'Hossain Al Mahmud','01701058775',NULL,'ACTIVE','2026-08-21 12:10:23.311','2026-08-21 12:10:23.311'),(6,'Eid Panjabi',NULL,NULL,'ACTIVE','2026-08-21 12:10:28.141','2026-08-21 12:10:28.141'),(12,'srrrrrrrrrrrrraaaaaaaaa',NULL,NULL,'ACTIVE','2026-08-21 12:10:58.686','2026-08-21 12:10:58.686'),(13,'Tanjim',NULL,NULL,'ACTIVE','2026-08-21 12:11:07.254','2026-08-23 20:04:12.436'),(14,'srthgsrtswrtb',NULL,NULL,'ACTIVE','2026-08-21 12:11:11.764','2026-08-21 12:11:11.764');
/*!40000 ALTER TABLE `workers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-28  0:02:34
