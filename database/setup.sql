SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

/*
	UserRequest is needed because a DraftTicket could contain multiple UserRequests from merging, 
	and we want to keep original UserRequests in case the DraftTicket is split.
	
	A DraftTicket will typically start with one user, but may have multiple users per one DraftTicket from merging,
	hence DraftTicketUserRequests. 
	Merging can just have the AI to summarise every user request for the DraftTicket maybe?
	
	If we were to split a merged DraftTicket, we can let the AI resummarise the UserRequests of the split DraftTickets.
	
	idk about summarising every UserRequest in a DraftTicket, 
	but the comment is here to explain the reason behind the tables.
*/

CREATE TABLE Users(
	email VARCHAR(64) PRIMARY KEY NOT NULL,
	name VARCHAR(128),
	password_hash varchar(255) DEFAULT NULL,
	google_id varchar(255) DEFAULT NULL,
	perm int DEFAULT 1 /* 1: User, 2: Specialist, 4: Admin */
);

CREATE TABLE UserRequest(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	userEmail VARCHAR(64) NOT NULL,
	requestContents VARCHAR(2048),
	tracking_token VARCHAR(64) UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE DraftTicket(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	summary VARCHAR(2048),
	title VARCHAR(256),
	suggestedSolutions VARCHAR(2048),
	suggestedAssignee VARCHAR(64),
	deadline DATETIME, /* EP03-ST003: Admin sets deadline on Draft */
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE DraftTicketUserRequest(
	draftTicketID INT NOT NULL,
	userRequestID INT NOT NULL,
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (draftTicketID, userRequestID)
);

CREATE TABLE DraftTicketAssignee(
	draftTicketID INT NOT NULL,
	assigneeEmail VARCHAR(64) NOT NULL,
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (draftTicketID, assigneeEmail)
);

CREATE TABLE DraftTicketCategory(
	draftTicketID INT NOT NULL,
	category VARCHAR(32) NOT NULL,
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (draftTicketID, category)
);

/* Specialist profile info linked to User account */
CREATE TABLE SpecialistProfile (
    userEmail VARCHAR(64) NOT NULL PRIMARY KEY,
    contact VARCHAR(64),
    FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

/* EP06-ST002: Define scope tags for specialists */
CREATE TABLE SpecialistScope (
    userEmail VARCHAR(64) NOT NULL,
    scopeTag VARCHAR(64) NOT NULL,
    FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE,
    CONSTRAINT primaryKey PRIMARY KEY (userEmail, scopeTag)
);

CREATE TABLE NewTicket(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	requestContents VARCHAR(2048),	/* This is summary from DraftTicket */
	suggestedSolutions VARCHAR(2048),
	title VARCHAR(256),
	status VARCHAR(32) DEFAULT 'new', /* States: new, assigned, solving, solved, failed, renew */
    deadline DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/* EP04-ST004: Support multiple assignees */
CREATE TABLE NewTicketAssignee(
	newTicketID INT NOT NULL,
	assigneeEmail VARCHAR(64) NOT NULL,
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (assigneeEmail) REFERENCES Users(email) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (newTicketID, assigneeEmail)
);

CREATE TABLE TicketComments (
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    ticketID INT NOT NULL,
    authorEmail VARCHAR(64) NOT NULL,
    text VARCHAR(2048) NOT NULL,
    isInternal BOOLEAN DEFAULT FALSE, /* EP05-ST001/ST002: Distinguish internal/public comments */
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
    FOREIGN KEY (authorEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE TicketHistory (
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    ticketID INT NOT NULL,
    action VARCHAR(128) NOT NULL,
    performedBy VARCHAR(64) NOT NULL,
    details VARCHAR(2048),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticketID) REFERENCES NewTicket(id) ON DELETE CASCADE
);

CREATE TABLE NewTicketFollower(
	newTicketID INT NOT NULL,
	userEmail VARCHAR(64) NOT NULL,
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (newTicketID, userEmail)
);

CREATE TABLE NewTicketCategory(
	newTicketID INT NOT NULL,
	category VARCHAR(32) NOT NULL,
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (newTicketID, category)
);

/* Link NewTicket back to original UserRequests for better tracking */
CREATE TABLE NewTicketUserRequest(
    newTicketID INT NOT NULL,
    userRequestID INT NOT NULL,
    FOREIGN KEY (newTicketID) REFERENCES NewTicket(id) ON DELETE CASCADE,
    FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE,
    CONSTRAINT primaryKey PRIMARY KEY (newTicketID, userRequestID)
);

/* Initial Seed Data */
/* Hard-coded demo accounts */
INSERT INTO Users (email, name, password_hash, perm) VALUES 
('admin@example.com', 'System Admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4),
('specialist@example.com', 'Demo Specialist', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2),
('user@example.com', 'Regular User', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

/* Ensure the Specialist has a profile so the JOINs don't fail */
INSERT INTO SpecialistProfile (userEmail, contact) VALUES
('specialist@example.com', 'Demo Line 555');

/* Give the Specialist a scope so they appear in filtered searches */
INSERT INTO SpecialistScope (userEmail, scopeTag) VALUES
('specialist@example.com', 'General Support'),
('specialist@example.com', 'Demonstration');

COMMIT;
