SET GLOBAL log_bin_trust_function_creators = 1;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";
SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- DROP ALL TABLES (REVERSE FK ORDER)
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS TicketUserRequest;
DROP TABLE IF EXISTS TicketCategory;
DROP TABLE IF EXISTS TicketFollower;
DROP TABLE IF EXISTS TicketHistory;
DROP TABLE IF EXISTS TicketComments;
DROP TABLE IF EXISTS TicketAssignee;
DROP TABLE IF EXISTS Ticket;
DROP TABLE IF EXISTS AssigneeScope;
DROP TABLE IF EXISTS DraftTicketCategory;
DROP TABLE IF EXISTS DraftTicketAssignee;
DROP TABLE IF EXISTS DraftTicketUserRequest;
DROP TABLE IF EXISTS DraftTicket;
DROP TABLE IF EXISTS UserRequest;
DROP TABLE IF EXISTS Users;

-- CREATE TABLES
CREATE TABLE sessions(
    session_id VARCHAR(128) PRIMARY KEY,
    expires int unsigned,
    data mediumtext
);  

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

CREATE TABLE AssigneeScope(
    userEmail VARCHAR(64),
    scopeTag VARCHAR(64),
    last_assigned_at DATETIME DEFAULT NULL,
    PRIMARY KEY (userEmail, scopeTag),
    FOREIGN KEY (userEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE Ticket(
    id INT AUTO_INCREMENT PRIMARY KEY,
    userRequestID INT,
    summary VARCHAR(2048),
    solution VARCHAR(2048),
    title VARCHAR(256),
    status VARCHAR(32) DEFAULT 'draft',
    resolutionComment VARCHAR(2048),
    deadline DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    mergedTo INT DEFAULT NULL,
    FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE
);

CREATE TABLE TicketAssignee(
    ticketID INT,
    assigneeEmail VARCHAR(64),
    PRIMARY KEY (ticketID, assigneeEmail),
    FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE
);

CREATE TABLE TicketComments(
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticketID INT,
    authorEmail VARCHAR(64),
    text VARCHAR(2048) NOT NULL,
    isInternal BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE,
    FOREIGN KEY (authorEmail) REFERENCES Users(email) ON DELETE CASCADE
);

CREATE TABLE TicketHistory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticketID INT,
    action VARCHAR(128),
    performer VARCHAR(64),
    details VARCHAR(2048),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TicketFollower(
    ticketID INT,
    userEmail VARCHAR(64),
    PRIMARY KEY (ticketID, userEmail),
    FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE
);

CREATE TABLE TicketCategory(
    ticketID INT,
    category VARCHAR(32),
    PRIMARY KEY (ticketID, category),
    FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE
);

CREATE TABLE TicketUserRequest(
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticketID INT,
    userRequestID INT,
    FOREIGN KEY (ticketID) REFERENCES Ticket(id) ON DELETE CASCADE,
    FOREIGN KEY (userRequestID) REFERENCES UserRequest(id) ON DELETE CASCADE
);

-- TRIGGERS
-- Note: Using '// ' with a space at the end to match your JS regex exactly
DELIMITER //

CREATE TRIGGER tr_DenyDeleteTicketHistory
BEFORE DELETE ON TicketHistory
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Deletions are not allowed on the TicketHistory table.';
END// 

CREATE TRIGGER tr_DeleteAssigneeOnUserDelete
AFTER DELETE ON Users
FOR EACH ROW
BEGIN
    DELETE FROM TicketAssignee WHERE assigneeEmail = OLD.email;
    DELETE FROM TicketFollower WHERE userEmail = OLD.email;
END// 

DELIMITER ;

-- INITIAL DATA | Pasword is YourUserPassword
INSERT INTO Users (email, name, password_hash, perm) VALUES 
('admin@example.com', 'Admin User', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 4),
('user@example.com', 'Regular User', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 1),
('assignee1.internship@example.com', 'Assignee 1', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2),
('assignee2.medical@example.com', 'Assignee 2', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2),
('assignee3.finance@example.com', 'Assignee 3', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2),
('assignee4.academics@example.com', 'Assignee 4', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2),
('assignee5.Transportation@example.com', 'Assignee 5', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2),
('assignee6.facility@example.com', 'Assignee 6', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2),
('assignee7.event@example.com', 'Assignee 7', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2),
('assignee8.administration@example.com', 'Assignee 8', '$2a$10$9HFpjKO3w4fESWW95/x7RO7y8asqHi.zK9c7EtzdbA.DtiJsCscLm', 2);

INSERT INTO AssigneeScope (userEmail, scopeTag) VALUES 
('assignee1@example.com', 'Internship'),
('assignee2@example.com', 'Medical'),
('assignee3@example.com', 'Finance'),
('assignee4@example.com', 'Academics'),
('assignee5@example.com', 'Transportation'),
('assignee6@example.com', 'Facility'),
('assignee7@example.com', 'Organised Events'),
('assignee8@example.com', 'Administration');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;