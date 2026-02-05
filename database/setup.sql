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

CREATE TABLE UserRequest(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	userEmail VARCHAR(64) NOT NULL,
	requestContents VARCHAR(2048)
);

CREATE TABLE DraftTicket(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	
	/*These are from AI and can be edited by admin*/
	summary VARCHAR(2048),
	title VARCHAR(256),
	suggestedSolutions VARCHAR(2048)
);

CREATE TABLE DraftTicketUserRequest(
	draftTicketID INT NOT NULL,
	userRequestID INT NOT NULL,
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	FOREIGN KEY (userRequestID) REFERENCES UserRequest(id),
	CONSTRAINT primaryKey PRIMARY KEY (draftTicketID, userRequestID)
);

CREATE TABLE DraftTicketAssignee(
	draftTicketID INT NOT NULL,
	assigneeID INT NOT NULL, /*Should be foreign key to Assignee's id but dont have Assignee yet*/
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (draftTicketID, assigneeID)
);

CREATE TABLE DraftTicketCategory(
	draftTicketID INT NOT NULL,
	category VARCHAR(32) NOT NULL,
	FOREIGN KEY (draftTicketID) REFERENCES DraftTicket(id) ON DELETE CASCADE,
	CONSTRAINT primaryKey PRIMARY KEY (draftTicketID, category)
);



CREATE TABLE NewTicket(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	requestContents VARCHAR(2048),	/*This is summary from DraftTicket*/
	suggestedSolutions VARCHAR(2048),
	title VARCHAR(256),
	status VARCHAR(32)
);

CREATE TABLE NewTicketFollower(
	newTicketID INT NOT NULL,
	userEmail VARCHAR(64) NOT NULL,
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id),
	CONSTRAINT primaryKey PRIMARY KEY (newTicketID, userEmail)
);

CREATE TABLE NewTicketCreator(
	newTicketID INT NOT NULL,
	assigneeID INT NOT NULL, /*Should be foreign key to Assignee's id but dont have Assignee yet*/
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id),
	CONSTRAINT primaryKey PRIMARY KEY (newTicketID, assigneeID)
);

CREATE TABLE NewTicketCategory(
	newTicketID INT NOT NULL,
	category VARCHAR(32) NOT NULL,
	FOREIGN KEY (newTicketID) REFERENCES NewTicket(id),
	CONSTRAINT primaryKey PRIMARY KEY (newTicketID, category)
);

COMMIT;
