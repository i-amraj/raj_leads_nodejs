CREATE DATABASE IF NOT EXISTS raj_leads_db;
USE raj_leads_db;

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rating DECIMAL(2, 1),
    reviews INT DEFAULT 0,
    address TEXT,
    phone VARCHAR(50),
    website VARCHAR(255),
    keyword VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_lead (name, address(100))
);
