CREATE DATABASE IF NOT EXISTS charityevents_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE charityevents_db;

CREATE TABLE event_categories (
    cat_id INT PRIMARY KEY AUTO_INCREMENT,
    cat_name VARCHAR(100) NOT NULL
);

CREATE TABLE events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(200) NOT NULL,
    event_description TEXT,
    event_date DATE NOT NULL,
    event_location VARCHAR(200) NOT NULL,
    cat_id INT,
    ticket_price DECIMAL(10,2) DEFAULT 0.00,
    charity_goal INT DEFAULT 0,
    charity_progress INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cat_id) REFERENCES event_categories(cat_id)
);

INSERT INTO event_categories (cat_name) VALUES 
('Fun Run'),('Gala Dinner'),('Silent Auction'),('Charity Concert');

INSERT INTO events (event_name,event_description,event_date,event_location,cat_id,ticket_price,charity_goal,charity_progress,is_active) VALUES
('City Fun Run 2026','Public charity running event to raise money for children education','2026-10-01','City Central Park',1,0.00,10000,3200,1),
('Autumn Charity Gala Dinner','Luxury gala dinner for poor family support','2026-10-15','Grand City Hotel',2,85.00,20000,8600,1),
('Art Silent Auction','Artwork auction for animal protection charity','2026-09-20','City Art Museum',3,0.00,8000,4500,1),
('Youth Charity Concert','Live music concert for rural school building','2026-11-05','City Concert Hall',4,35.00,15000,9200,1),
('Senior Care Fun Run','Community running event for elderly care','2026-09-15','West District Park',1,15.00,5000,2100,1),
('Winter Charity Gala','Annual winter charity dinner for disaster relief','2026-12-20','City Convention Center',2,120.00,30000,12500,1),
('Book Charity Auction','Books and stationery auction for student aid','2026-10-28','Community Center',3,0.00,3000,1800,1),
('Christmas Charity Concert','Christmas special charity performance','2026-12-10','City Theater',4,45.00,12000,7800,0);
