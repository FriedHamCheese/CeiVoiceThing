SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";
SET FOREIGN_KEY_CHECKS = 0;

-- =========================

CREATE TABLE IF NOT EXISTS Users(
	email VARCHAR(64) PRIMARY KEY NOT NULL,
	name VARCHAR(128),
	password_hash VARCHAR(255) DEFAULT NULL,
	google_id VARCHAR(255) DEFAULT NULL,
	perm INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS UserRequest(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	userEmail VARCHAR(64) NOT NULL,
	requestContents VARCHAR(2048),
	tracking_token VARCHAR(64) UNIQUE,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DraftTicket(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	summary VARCHAR(2048),
	title VARCHAR(256),
	suggestedSolutions VARCHAR(2048),
	suggestedAssignee VARCHAR(64),
	deadline DATETIME,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS DraftTicketUserRequest(
	draftTicketID INT NOT NULL,
	userRequestID INT NOT NULL,
	PRIMARY KEY (draftTicketID, userRequestID),
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DraftTicketAssignee(
	draftTicketID INT NOT NULL,
	assigneeEmail VARCHAR(64) NOT NULL,
	PRIMARY KEY (draftTicketID, assigneeEmail),
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS DraftTicketCategory(
	draftTicketID INT NOT NULL,
	category VARCHAR(32) NOT NULL,
	PRIMARY KEY (draftTicketID, category),
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SpecialistProfile(
	userEmail VARCHAR(64) PRIMARY KEY NOT NULL,
	contact VARCHAR(64),
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SpecialistScope(
	userEmail VARCHAR(64) NOT NULL,
	scopeTag VARCHAR(64) NOT NULL,
	PRIMARY KEY (userEmail, scopeTag),
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS NewTicket(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	requestContents VARCHAR(2048),
	suggestedSolutions VARCHAR(2048),
	title VARCHAR(256),
	status VARCHAR(32) DEFAULT 'new',
	deadline DATETIME,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS NewTicketAssignee(
	newTicketID INT NOT NULL,
	assigneeEmail VARCHAR(64) NOT NULL,
	PRIMARY KEY (newTicketID, assigneeEmail),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TicketComments(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	ticketID INT NOT NULL,
	authorEmail VARCHAR(64) NOT NULL,
	text VARCHAR(2048) NOT NULL,
	isInternal BOOLEAN DEFAULT FALSE,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (authorEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TicketHistory(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	ticketID INT NOT NULL,
	action VARCHAR(128) NOT NULL,
	performedBy VARCHAR(64) NOT NULL,
	details VARCHAR(2048),
	timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS NewTicketFollower(
	newTicketID INT NOT NULL,
	userEmail VARCHAR(64) NOT NULL,
	PRIMARY KEY (newTicketID, userEmail),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS NewTicketCategory(
	newTicketID INT NOT NULL,
	category VARCHAR(32) NOT NULL,
	PRIMARY KEY (newTicketID, category),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS NewTicketUserRequest(
	newTicketID INT NOT NULL,
	userRequestID INT NOT NULL,
	PRIMARY KEY (newTicketID, userRequestID),
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE
);

-- =========================

INSERT INTO Users (email, name, password_hash, perm) VALUES 
('admin@example.com', 'System Admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4),
('specialist@example.com', 'Demo Specialist', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2),
('user@example.com', 'Regular User', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
password_hash = VALUES(password_hash),
perm = VALUES(perm);

INSERT INTO SpecialistProfile (userEmail, contact) VALUES
('specialist@example.com', 'Demo Line 555')
ON DUPLICATE KEY UPDATE
contact = VALUES(contact);

INSERT INTO SpecialistScope (userEmail, scopeTag) VALUES
('specialist@example.com', 'General Support'),
('specialist@example.com', 'Demonstration')
ON DUPLICATE KEY UPDATE
scopeTag = VALUES(scopeTag);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;