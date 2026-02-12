SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";
SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- =========================
-- DROP ALL TABLES (REVERSE FK ORDER)
-- =========================

DROP TABLE IF EXISTS NewTicketUserRequest;
DROP TABLE IF EXISTS NewTicketCategory;
DROP TABLE IF EXISTS NewTicketFollower;
DROP TABLE IF EXISTS TicketHistory;
DROP TABLE IF EXISTS TicketComments;
DROP TABLE IF EXISTS NewTicketAssignee;
DROP TABLE IF EXISTS NewTicket;

DROP TABLE IF EXISTS SpecialistScope;
DROP TABLE IF EXISTS SpecialistProfile;

DROP TABLE IF EXISTS DraftTicketCategory;
DROP TABLE IF EXISTS DraftTicketAssignee;
DROP TABLE IF EXISTS DraftTicketUserRequest;
DROP TABLE IF EXISTS DraftTicket;

DROP TABLE IF EXISTS UserRequest;
DROP TABLE IF EXISTS Users;

-- =========================
-- CREATE TABLES
-- =========================

CREATE TABLE Users(
	email VARCHAR(64) PRIMARY KEY,
	name VARCHAR(128),
	password_hash VARCHAR(255),
	google_id VARCHAR(255),
	perm INT DEFAULT 1
);

CREATE TABLE UserRequest(
	id INT AUTO_INCREMENT PRIMARY KEY,
	userEmail VARCHAR(64) NOT NULL,
	requestContents VARCHAR(2048),
	tracking_token VARCHAR(64) UNIQUE,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE DraftTicket(
	id INT AUTO_INCREMENT PRIMARY KEY,
	summary VARCHAR(2048),
	title VARCHAR(256),
	suggestedSolutions VARCHAR(2048),
	suggestedAssignee VARCHAR(64),
	deadline DATETIME,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE DraftTicketUserRequest(
	draftTicketID INT,
	userRequestID INT,
	PRIMARY KEY (draftTicketID, userRequestID),
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE
);

CREATE TABLE DraftTicketAssignee(
	draftTicketID INT,
	assigneeEmail VARCHAR(64),
	PRIMARY KEY (draftTicketID, assigneeEmail),
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE DraftTicketCategory(
	draftTicketID INT,
	category VARCHAR(32),
	PRIMARY KEY (draftTicketID, category),
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE
);

CREATE TABLE SpecialistProfile(
	userEmail VARCHAR(64) PRIMARY KEY,
	contact VARCHAR(64),
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE SpecialistScope(
	userEmail VARCHAR(64),
	scopeTag VARCHAR(64),
	PRIMARY KEY (userEmail, scopeTag),
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE NewTicket(
	id INT AUTO_INCREMENT PRIMARY KEY,
	requestContents VARCHAR(2048),
	suggestedSolutions VARCHAR(2048),
	title VARCHAR(256),
	status VARCHAR(32) DEFAULT 'new',
	deadline DATETIME,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE NewTicketAssignee(
	newTicketID INT,
	assigneeEmail VARCHAR(64),
	PRIMARY KEY (newTicketID, assigneeEmail),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE TicketComments(
	id INT AUTO_INCREMENT PRIMARY KEY,
	ticketID INT,
	authorEmail VARCHAR(64),
	text VARCHAR(2048) NOT NULL,
	isInternal BOOLEAN DEFAULT FALSE,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (authorEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE TicketHistory(
	id INT AUTO_INCREMENT PRIMARY KEY,
	ticketID INT,
	action VARCHAR(128),
	performedBy VARCHAR(64),
	details VARCHAR(2048),
	timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE
);

CREATE TABLE NewTicketFollower(
	newTicketID INT,
	userEmail VARCHAR(64),
	PRIMARY KEY (newTicketID, userEmail),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE NewTicketCategory(
	newTicketID INT,
	category VARCHAR(32),
	PRIMARY KEY (newTicketID, category),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE
);

CREATE TABLE NewTicketUserRequest(
	newTicketID INT,
	userRequestID INT,
	PRIMARY KEY (newTicketID, userRequestID),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE
);

-- =========================
-- SEED DATA
-- =========================

INSERT INTO Users (email, name, password_hash, perm) VALUES 
('admin@example.com', 'System Admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4),
('specialist@example.com', 'Demo Specialist', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2),
('user@example.com', 'Regular User', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

INSERT INTO SpecialistProfile (userEmail, contact) VALUES
('specialist@example.com', 'Demo Line 555');

INSERT INTO SpecialistScope (userEmail, scopeTag) VALUES
('specialist@example.com', 'General Support'),
('specialist@example.com', 'Demonstration');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;