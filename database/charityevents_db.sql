
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `charityevents_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `charityevents_db`;
DROP TABLE IF EXISTS `charity_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `charity_events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `organisation_id` int NOT NULL,
  `category_id` int NOT NULL,
  `event_title` varchar(150) NOT NULL,
  `event_description` text,
  `event_date` datetime NOT NULL,
  `location` varchar(150) DEFAULT NULL,
  `latitude` decimal(9,6) DEFAULT NULL,
  `longitude` decimal(9,6) DEFAULT NULL,
  `ticket_price` decimal(10,2) DEFAULT '0.00',
  `fundraising_goal` decimal(12,2) DEFAULT NULL,
  `current_progress` decimal(12,2) DEFAULT '0.00',
  `is_suspended` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`event_id`),
  KEY `fk_event_org` (`organisation_id`),
  KEY `fk_event_category` (`category_id`),
  CONSTRAINT `fk_event_category` FOREIGN KEY (`category_id`) REFERENCES `event_categories` (`category_id`),
  CONSTRAINT `fk_event_org` FOREIGN KEY (`organisation_id`) REFERENCES `charity_organisations` (`organisation_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `charity_events` WRITE;
/*!40000 ALTER TABLE `charity_events` DISABLE KEYS */;
INSERT INTO `charity_events` VALUES (1,1,1,'Community Fun Run','A 5km community run to raise money for local children in need. All ages welcome and every entry includes a finisher medal.','2026-10-12 09:00:00','Central Park',-33.888600,151.204400,0.00,5000.00,1200.00,0),(2,1,2,'Charity Gala Dinner','A formal fundraising dinner with a three-course meal, live auction and guest speakers from the community.','2026-10-18 18:30:00','City Hotel',-33.868800,151.209300,85.00,12000.00,4500.00,0),(3,1,3,'Silent Auction','A silent auction featuring donated artworks, vouchers and memorabilia. Bidding closes at 4pm sharp.','2026-10-22 14:00:00','Community Hall',-33.873100,151.206500,15.00,8000.00,3200.00,0),(4,1,4,'Charity Concert','An evening of live music performed by local bands to raise funds for the community program.','2026-10-25 19:00:00','Town Hall',-33.873100,151.206300,45.00,10000.00,6100.00,0),(5,1,1,'Autumn Fun Run','A family friendly fun run around the lake with a shorter 2km course for younger participants.','2026-11-05 08:30:00','Lake Park',-33.920000,151.230000,0.00,4000.00,900.00,0),(6,1,2,'Winter Charity Dinner','A seasonal fundraising dinner celebrating local produce, with all proceeds supporting the winter appeal.','2026-11-12 19:00:00','Harbour Restaurant',-33.856800,151.215300,95.00,15000.00,7800.00,0),(7,1,3,'Book Silent Auction','A second hand book auction with thousands of donated titles across every genre.','2026-11-18 10:00:00','Library',-33.865000,151.209000,5.00,3000.00,1100.00,0),(8,1,4,'Youth Charity Concert','A youth band charity show supporting local music education programs.','2026-11-20 18:00:00','School Hall',-33.890000,151.220000,30.00,6000.00,2400.00,0),(9,1,1,'Spring Fundraising Breakfast','A community breakfast that kicked off the spring fundraising campaign.','2026-09-20 07:30:00','Community Hall',-33.873100,151.206500,25.00,3500.00,3500.00,0),(10,1,4,'Winter Food Drive Concert','A benefit concert held to support the winter food drive for families in need.','2026-08-15 18:00:00','Town Hall',-33.873100,151.206300,20.00,5000.00,4200.00,0),(11,1,1,'Suspended Test Run','This event has been suspended and is only kept for administrative testing.','2026-12-01 09:00:00','Test Park',-33.900000,151.200000,0.00,2000.00,500.00,1);
/*!40000 ALTER TABLE `charity_events` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `charity_organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `charity_organisations` (
  `organisation_id` int NOT NULL AUTO_INCREMENT,
  `organisation_name` varchar(100) NOT NULL,
  `mission` text,
  `contact_email` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`organisation_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `charity_organisations` WRITE;
/*!40000 ALTER TABLE `charity_organisations` DISABLE KEYS */;
INSERT INTO `charity_organisations` VALUES (1,'City Community Charity','Support local vulnerable groups and raise funds for community projects through charity events.','info@citycharity.org','0412345678');
/*!40000 ALTER TABLE `charity_organisations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `event_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(50) NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `event_categories` WRITE;
/*!40000 ALTER TABLE `event_categories` DISABLE KEYS */;
INSERT INTO `event_categories` VALUES (1,'Fun Run'),(2,'Gala Dinner'),(3,'Silent Auction'),(4,'Charity Concert');
/*!40000 ALTER TABLE `event_categories` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `event_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_registrations` (
  `registration_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `attendee_name` varchar(100) NOT NULL,
  `attendee_email` varchar(150) NOT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `tickets_purchased` int NOT NULL DEFAULT '1',
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `registration_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `registration_status` enum('Confirmed','Pending','Cancelled') NOT NULL DEFAULT 'Confirmed',
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `uq_registration_event_email` (`event_id`,`attendee_email`),
  CONSTRAINT `fk_registration_event` FOREIGN KEY (`event_id`) REFERENCES `charity_events` (`event_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `event_registrations` WRITE;
/*!40000 ALTER TABLE `event_registrations` DISABLE KEYS */;
INSERT INTO `event_registrations` VALUES (1,2,'Tianyu Xue','xty3488543330@qq.com','0412345678',2,170.00,'2026-09-28 10:15:00','Confirmed'),(2,2,'Liwei Jin','1778257879@qq.com','0423456789',4,340.00,'2026-10-01 14:05:00','Confirmed'),(3,2,'Emma Wilson','emma.wilson@example.com','0434567890',1,85.00,'2026-10-03 09:40:00','Confirmed'),(4,2,'Noah Brown','noah.brown@example.com','0445678901',2,170.00,'2026-10-05 20:10:00','Confirmed'),(5,3,'Olivia Taylor','olivia.taylor@example.com','0456789012',3,45.00,'2026-09-30 11:20:00','Confirmed'),(6,3,'Liam Martin','liam.martin@example.com','0467890123',1,15.00,'2026-10-04 16:45:00','Pending'),(7,4,'Sophia Lee','sophia.lee@example.com','0478901234',2,90.00,'2026-10-02 08:30:00','Confirmed'),(8,4,'Jack Anderson','jack.anderson@example.com','0489012345',5,225.00,'2026-10-06 19:00:00','Confirmed'),(9,5,'Mia Thomas','mia.thomas@example.com','0490123456',2,0.00,'2026-10-06 12:00:00','Confirmed'),(10,6,'William Clark','william.clark@example.com','0401234567',3,285.00,'2026-10-07 10:25:00','Confirmed'),(11,6,'Isabella Hall','isabella.hall@example.com','0412340987',1,95.00,'2026-10-08 15:50:00','Confirmed'),(12,7,'James Young','james.young@example.com','0423451987',6,30.00,'2026-10-08 18:05:00','Confirmed'),(13,8,'Ava King','ava.king@example.com','0434562876',2,60.00,'2026-10-09 09:15:00','Confirmed'),(14,1,'Tianyu Xue','xty3488543330@qq.com','0412345678',1,0.00,'2026-10-09 08:45:00','Confirmed');
/*!40000 ALTER TABLE `event_registrations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

