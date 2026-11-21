

# **CEiVoice System Requirements Specification (Bulleted Acceptance Criteria)**

## **Project Summary**

**CEiVoice** is an **AI-enhanced Support Ticket Management System** designed to streamline and automate the initial processing of user requests. The system captures requests submitted via a simple form (email and message) and leverages **Artificial Intelligence (AI)** to analyze the content, automatically generating a draft ticket complete with a suggested title, category, summary, resolution path, and the appropriate assignee. This allows administrators and support staff to focus on resolution rather than categorization and assignment. CEiVoice supports a full ticket lifecycle, from initial draft consolidation (for mass issues) and submission, through status updates, collaboration, reassignment, and comprehensive reporting. The ultimate goal is to increase the efficiency of the support team and improve communication with users.

---

## **Main Steps**

**Ticket Initiation (The User)**

1. **Submission:** The user submits a support request through a simplified form, providing only their **email** and a **description** of the issue.  
2. **Capture:** CEiVoice receives the message and immediately prepares it for processing.

**AI Automated Processing (The System)**

3. **Intelligence Analysis:** The AI analyzes the content of the message to understand the intent and urgency.  
4. **Draft Generation:** The system automatically populates a draft ticket with:  
   1. A concise **Title** and **Summary**.  
   2. An appropriate **Category**.  
   3. A suggested **Solution**.  
   4. The most suitable **Assignee**.

**Administrative Management (The Support Staff)**

5. **Review & Consolidation:** Admins review the AI-generated drafts. For widespread problems, they can consolidate multiple related drafts into a single "mass issue" ticket.  
6. **Activation:** The admin confirms the details and submits the draft into the active ticket lifecycle.  
7. **Lifecycle Management:** The support team manages the ticket through various stages:  
   1. Updating **Status** (Open, In Progress, Resolved).  
   2. **Collaborating** with team members or **reassigning** tasks as needed.

**Resolution & Optimization (The System)**

8. **Communication:** The system facilitates ongoing communication back to the user until the issue is closed.  
9. **Reporting:** The system built-in reporting tools to analyze support efficiency and identify trends to improve future performance.

## ---

## **User Stories and Acceptance Criteria**

### **Epic EP01: User Request Submission and Tracking**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| **EP01-ST001** | **As a User**, I want to easily fill out a request form with my login email and a message, so that I can **report an issue or make a request quickly**. | The request form must be accessible from the system's main public page.  The form shows the Email of the login user. The form must contain a mandatory multi-line text field for the **Message/Request body**. The form must have a clearly labeled 'Submit' button. |
| **EP01-ST002** | **As a User**, I want to receive an immediate confirmation after submitting a request, so that I **know my submission was successful**. | Upon successful submission, the user must be redirected to a dedicated confirmation page.  The confirmation page must display a clear, friendly success message.  The system must send an automated confirmation email to the provided email address within **60 seconds**. |
| **EP01-ST003** | **As a User**, I want to be able to **track the current status** of my submitted request, so that I am **informed about the progress**. | The system must provide a unique link or tracking ID for the user to access their request page.  The request page must display the ticket's current, official status.  The page must be accessible without requiring the user to log in, using only the provided email/link combination. |
| **EP01-ST004** | **As a User**, I want to be able to register and log in using my **Google Account**, so that the **process is fast and secure**. | A 'Sign in with Google' button must be prominently displayed on the login/registration page.  Successful sign-in via Google must automatically create a new user account if one does not exist.  The user's account must be provisioned with their Google email address and name. |
| **EP01-ST005** | **As a User**, I want to be **notified via email** about updates or comments on my request, so that I don't have to constantly check the system. | An email notification must be sent to the User when their request is formally converted from a **Draft** to a **New** ticket.  An email notification must be sent to the User when the ticket's status is changed to *Solved* or *Failed*.  An email notification must be sent to the User when a new **public comment** is added by an Assignee. |

---

**Epic EP02: AI-Powered Draft Ticket Generation**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| **EP02-ST001** | **As an AI component**, I want to automatically analyze a new user request's message, so that I can **create a preliminary understanding of the issue**. | The AI processing must begin immediately upon successful submission of a new request.  All AI suggestions must be generated and ready for Admin review. |
| **EP02-ST002** | **As an AI component**, I want to suggest a concise and relevant title for the request, so that the Admin can quickly identify the subject. | A suggested **Title** (max 100 characters) must be populated in the draft ticket.  The suggested Title must accurately reflect the core issue described in the user's message. |
| **EP02-ST003** | **As an AI component**, I want to suggest an appropriate category for the request, so that it can be easily filtered and managed. | A single suggested **Category** (e.g., *Technical Support, Billing*) must be pre-selected on the draft ticket from a predefined list.  |
| **EP02-ST004** | **As an AI component**, I want to generate a summary of the request, so that the Admin doesn't have to read the full original message for context. | A concise **Summary** (max 500 characters) must be generated and populated in the draft ticket.  The Summary must capture all key facts and the user's ultimate goal mentioned in the original message. |
| **EP02-ST005** | **As an AI component**, I want to propose potential solutions or next steps as a suggested resolution path, so that the Admin has a starting point for action. | A **Suggested Solution** must be generated and stored with the draft ticket. This suggestion must propose 1-3 actionable steps or resources relevant to the request. |
| **EP02-ST006** | **As an AI component**, I want to recommend the most suitable assignee(s) based on the request's content and their defined scope, so that the draft ticket is routed correctly for initial review. | At least one **Assignee** must be selected from the list of active Assignees. The selected Assignee(s) must have a defined scope that is highly relevant to the ticket's suggested Category. |
| **EP02-ST007** | **As the System**, I want to automatically create a new draft ticket containing the original request and all the AI-generated suggestions, so that the Admin has a ready-to-review item. | A record with the status **'Draft'** must be created in the database. This record must contain the original user's email, message, and all AI-generated fields. The Admin dashboard must clearly show this new record in a dedicated 'Draft' queue. |

---

### 

### **Epic EP03: Admin Draft and Ticket Management**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| **EP03-ST001** | **As an Admin**, I want to view a list of all current draft tickets, so that I can prioritize and manage the requests needing review. | The Admin dashboard must include a dedicated filter or view for tickets with the status **'Draft'**. This list must display the AI-suggested Title, the original request email, and the time of submission. |
| **EP03-ST002** | **As an Admin**, I want to be able to modify any AI-generated field (Title, Category, Summary, Resolution Path, Assignee) on a draft ticket, so that I can ensure accuracy before official creation. | All AI-suggested text fields must be **editable** by the Admin.  The Assignee and Category fields must be selectable from their respective system lists.  The Admin must be able to save their changes without immediately submitting the ticket. |
| **EP03-ST003** | **As an Admin**, I want to set a deadline for the ticket, so that the Assignee has a target for resolution. | A date/time picker field for **Deadline** must be available on the Draft Ticket edit screen.  This deadline must be included as metadata when the ticket is submitted. |
| **EP03-ST004** | **As an Admin**, I want to easily link multiple similar user requests to a single draft ticket, so that I can process mass reports efficiently. | When multiple requests are deemed similar, the Admin must be able to execute a **'Merge into Draft'** action.  The resulting single Draft Ticket must display a count and list of all linked original requests. |
| **EP03-ST005** | **As an Admin**, I want to be able to add or remove individual user requests from a consolidated draft ticket, so that I have control over the grouping. | The Draft Ticket view must allow the Admin to unlink any of the consolidated original requests.  When a request is unlinked, it must revert to a new, separate **'Draft'** ticket. |
| **EP03-ST006** | **As an Admin**, I want to click a 'Submit' button on a draft ticket, so that it is officially created as a 'New' ticket and is visible to the assigned party. | Clicking 'Submit' must change the ticket status from **'Draft'** to **'New'**. The original Creator(s) of the linked requests must be automatically set as **Followers** on the newly created ticket. The assigned Assignee(s) must immediately see the ticket in their active workload queue. |

---


### **Epic EP04: Ticket Resolution and Workflow**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| **EP04-ST001** | **As an Assignee**, I want to see all tickets currently assigned to me, so that I **know my workload and priorities**. | The Assignee dashboard must default to a view filtering for tickets where they are listed as an **Assignee** with a status other than *Solved* or *Failed*.  The list must be sortable by urgency (e.g., time remaining until Deadline). |
| **EP04-ST002** | **As an Assignee**, I want to be able to update a ticket's status to one of the available states (e.g., *new, assigned, solving, solved, failed, renew*), so that the status accurately reflects the work in progress. | A dropdown or button set for status selection must be present on the ticket view.  The Assignee must be able to move the ticket to any valid status.  Changing the status to *Solved* or *Failed* must require the Assignee to submit a final resolution comment. |
| **EP04-ST003** | **As an Assignee**, I want the system to automatically record and display a history of all status changes for a ticket, so that the complete workflow is traceable. | The ticket view must include a **History** log.  Every status change must generate a record in the History log, including the *old status*, the *new status*, the *time/date*, and the *Assignee* who performed the action. |
| **EP04-ST004** | **As an Assignee**, I want to be able to re-assign a ticket to another Assignee, so that I can escalate or redirect the issue when necessary. | A **'Reassign'** function must be available on the ticket view. The Assignee must be able to select one or more new active Assignees. |
| **EP04-ST005** | **As an Assignee**, I want the system to record and display a history of all re-assignments, so that I can track who has owned the ticket previously. | The Reassignment must be recorded as an entry in the main ticket **History** log. The entry must clearly state the *previous Assignee* and the *new Assignee(s)*. |

---

### 

### **Epic EP05: Collaboration and Communication**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| **EP05-ST001** | **As an Assignee** or **User (Creator/Follower)**, I want to see all comments related to a ticket, so that I can follow the conversation and resolution process. | All comments must be displayed chronologically at the bottom of the ticket view. The comment thread must clearly distinguish between internal comments (Assignee/Admin only) and public comments (all roles). |
| **EP05-ST002** | **As an Assignee** or **User (Creator/Follower)**, I want to be able to reply to comments, so that I can engage in a dialogue about the ticket. | A text entry box must be available for all roles with viewing access. Users (Creator/Follower) can only submit **public comments**. Assignees and Admins must have the option to mark their comment as **'Internal'** or **'Public'**. |
| **EP05-ST003** | **As an Assignee** or **User (Creator/Follower)**, I want to be able to see the full list of Assignees, the Creator, and all Followers on a ticket, so that I know who is involved. | A dedicated section on the ticket page must display the names/emails of the **Creator**, all current **Assignees**, and all **Followers**. |

---

### 

### **Epic EP06: System Administration and Reporting**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| **EP06-ST001** | **As an Admin**, I want to be able to define which registered users are granted the 'Assignee' role, so that only qualified personnel can resolve tickets. | The Admin user management interface must allow the Admin to toggle the **'Assignee' role** for any registered user. Only users with the **'Assignee'** role can be selected in the ticket assignment flow. |
| **EP06-ST002** | **As an Admin**, I want to define the scope of work (e.g., departments, topics) for each Assignee, so that the AI can accurately assign tickets. | The Admin must be able to associate one or more predefined **Scope tags** (e.g., *IT, HR, Finance*) with an Assignee's profile. The AI component must use this scope mapping as the primary factor when suggesting Assignees. |
| **EP06-ST003** | **As an Admin**, I want to access a report dashboard that summarizes overall ticket volume, resolution times, and current backlogs, so that I can monitor system performance and identify bottlenecks. | The Admin dashboard must display visual metrics for: Total number of tickets created over a customizable period; Average time taken to move a ticket from *New* to *Solved*; Breakdown of tickets by **Category** and **current Status**. |
| **EP06-ST004** | **As an Assignee**, I want to access a report dashboard that summarizes my personal ticket metrics (e.g., solved tickets, current workload), so that I can manage my performance. | The Assignee's personal view must display metrics for: Number of tickets currently assigned to them; Number of tickets they have moved to *Solved* or *Failed* in the last 30 days. |
| **EP06-ST005** | **As the System**, I want to ensure the ticket history includes all changes, comments, and status updates, so that a complete audit trail is maintained. | The **History** log must be read-only for all users and admins (i.e., historical entries cannot be deleted or modified). Every action that alters the ticket's state (status, assignment, deadline) must be logged. |

---

### 

### **Epic EP07: User Experience and Non-Functional Requirements**

| ID | User Story | Acceptance Criteria |
| :---- | :---- | :---- |
| **EP07-ST001** | **As a User**, I want the CEiVoice interface to have a professional and modern design, so that it is intuitive and pleasant to use. | The system must adhere to a consistent style guide (e.g., color palette, typography) across all pages.  Key navigation elements must be accessible with no more than **two clicks** from the respective landing page. |
| **EP07-ST002** | **As a User**, I want the system to be fully functional and easy to navigate on a **mobile device**, so that I can access or manage tickets from anywhere. | The system UI must be **fully responsive** and display correctly on screen sizes down to 360px width. All forms must be usable via touch interface without requiring horizontal scrolling. |
| **EP07-ST003** | **As the System**, I want to be highly responsive and fast when loading pages and submitting forms, so that users do not experience frustration or delays. | All primary pages must load and be interactive within a maximum of **2 seconds** over a standard broadband connection. Form submissions must process and return a confirmation message within **1 second** (excluding AI processing time). |
| **EP07-ST004** | **As the System**, I want to implement strong security measures, so that all user data and communication are protected. | All user communication and login data must be encrypted in transit using **HTTPS/SSL**. |
| **EP07-ST005** | **As the System**, I want the AI suggestions to be generated quickly (e.g., within 30 seconds of submission), so that the draft ticket is ready for Admin review without delay. | AI processing time from form submission to draft creation must not exceed **30 seconds** for 95% of requests. |

## **Key Scenario UAT Test Cases**

### **1\. User Submission and Tracking**

| Test ID | Scenario/Feature | Role | Test Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- |
| **UAT-SUB-001** | Basic Request Submission | User | Navigate to the request form.  Enter a valid email and a detailed message (e.g., "I cannot access my classroom portal.").  Click 'Submit'. | The system displays a **success confirmation message**.  The User immediately receives an **email confirmation**.  A **Draft Ticket** is created in the ticket tracking view. |
| **UAT-SUB-002** | Google Account Registration/Login | User | Click the 'Sign Up/Login' link.  Select 'Continue with Google'. | The User is **successfully registered/logged in** and can access the ticket tracking view. |
| **UAT-SUB-003** | Ticket Status Visibility | User | Access the ticket tracking view for a submitted request.  Let an Admin/Assignee change the status to 'Solved'. | The User is able to see the **current status ('Solved')** and all **public comments/updates** on their request page. |

---

### **2\. AI Draft Generation and Admin Review**

| Test ID | Scenario/Feature | Role | Test Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- |
| **UAT-AI-001** | AI Suggestion Accuracy | Admin | Submit a complex request (e.g., "My email is down and I'm using an old version of Windows.").  Navigate to the new Draft Ticket. | The AI component has automatically generated a **relevant Title, a correct Category, a clear Summary, and a logical Resolution Path** based on the message. This draft ticket can be viewed by the Admin. |
| **UAT-AI-002** | AI Assignee Recommendation | Admin | Submit a request related to a specific team (e.g., "Need to reset my database password.").  Navigate to the new Draft Ticket. | The AI component suggests an **Assignee whose scope matches 'Database' or 'IT Operations'**, demonstrating correct routing logic. |
| **UAT-ADM-003** | Admin Modification and Submission | Admin | View a Draft Ticket.  Change the AI-suggested Assignee.  Edit the AI-suggested Title.  Set a Deadline for the ticket.  Click 'Submit'. | The Draft Ticket becomes a **New** ticket. The ticket retains the **Admin-edited Title, the new Assignee, and the set Deadline**.  The original User (Creator) receives a notification. |

---

### **3\. Consolidation and Workflow Management**

| Test ID | Scenario/Feature | Role | Test Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- |
| **UAT-CON-001** | AI Consolidation of Mass Requests | Admin | 1\. Have three separate Users submit the exact same message ("The 3D printer in our lab is broken\!").  2\. Navigate to the Draft Tickets view. | The system **recommends merging all three requests** into a single Draft Ticket, listing all three Users as potential **Followers**. |
| **UAT-WF-002** | Status Change and History | Assignee | 1\. Take ownership of a 'New' ticket.  2\. Change the status to 'Assigned'.  3\. Change the status to 'Solving'.  4\. Change the status to 'Failed' (cannot be resolved). | The system **records all four status changes** in the ticket's history/audit log, visible to all parties (Assignees, Admin, User). |
| **UAT-WF-003** | Reassignment and Notification | Assignee | View a ticket assigned to them.  Click the 'Reassign' function and select a different Assignee. | The ticket is successfully **assigned to the new Assignee**.  The **reassignment is logged in the history**.  The **new Assignee receives a notification**. |

---

### **4\. Collaboration and Reporting**

| Test ID | Scenario/Feature | Role | Test Steps | Expected Result |
| :---- | :---- | :---- | :---- | :---- |
| **UAT-COM-001** | Internal vs. Public Comments | Assignee | Add a **public comment** on a ticket ("The fix is scheduled for 3 PM.").  Add an **internal comment** on the same ticket ("This issue is much bigger than expected."). | The original **User (Creator/Follower) can see the public comment** but **cannot see the internal comment**.  The **Admin and other Assignees can see both comments**. |
| **UAT-REP-002** | Admin Global Reporting | Admin | Navigate to the Admin Report Dashboard. Filter by 'All Tickets' and 'Last 30 Days'. | The dashboard displays an accurate summary of **total ticket volume, average resolution time, and top categories**, demonstrating the Admin's ability to see the system's global performance. |
| **UAT-REP-003** | Assignee Personal Reporting | Assignee | Navigate to the Assignee Report Dashboard. | The dashboard correctly shows the Assignee's **current workload** and **personal metrics** (e.g., total tickets solved by them), demonstrating the role's scoped reporting. |
| **UAT-NF-004** | Mobile Responsiveness | User/Assignee/Admin | Access the system on a smartphone or tablet. Attempt to fill a form, update a status, and view a report. | The interface is **fully responsive**, all elements are easily navigable, and functionality is **not degraded** on the mobile device. |

