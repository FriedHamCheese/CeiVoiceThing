# CEiVoice Strict Progress Report (Comprehensive Audit)

This report tracks system compliance against the acceptance criteria defined in [goal.md](file:///c:/Uni/Y2/S2/WebDev/CeiVoiceThing/goal.md).

## Implementation Status Table

| ID | Requirement / Acceptance Criteria | Implementation Location | Fix Needed | Test Needed |
| :--- | :--- | :--- | :--- | :--- |
| **EP01-ST001** | Form with email & message | `frontend/src/NewTicket.jsx` | None | Verify mandatory fields prevent submisson. |
| **EP01-ST002** | Confirmation page & Email (60s) | `frontend/src/utils/newTicketLogic.js`, `backend/utils/email.js` | None | Submit request; verify immediate redirect and email receipt. |
| **EP01-ST003** | Public Tracking (No login) | `frontend/src/Track.jsx`, `backend/routes/ticketRouterPublic.js` | None | Access tracking URL in incognito; verify status visibility. |
| **EP01-ST004** | Google Account Login | `backend/routes/authRouter.js`, `frontend/src/Login.jsx` | None | Click Google Btn; verify user creation in DB. |
| **EP01-ST005** | Update Notifications (Promotion/Resolved) | `backend/routes/ticketRouterAdmin.js`, `backend/utils/email.js` | None | Promote ticket; check follower emails. |
| **EP02-ST001** | Immediate AI Analysis | `backend/routes/ticketRouter.js` | None | Submit request; monitor backend logs for AI trigger. |
| **EP02-ST002** | AI-Suggested Title | `backend/utils/ticketOracle.js` | None | Submit "Broken Printer"; check if draft title is relevant. |
| **EP02-ST003** | AI-Suggested Category | `backend/utils/ticketOracle.js` | None | Verify category matches predefined list. |
| **EP02-ST004** | AI-Suggested Summary | `backend/utils/ticketOracle.js` | None | Check draft summary length (< 500 chars). |
| **EP02-ST005** | AI-Suggested Resolution | `backend/utils/ticketOracle.js` | None | Verify 1-3 actionable steps in "Solutions". |
| **EP02-ST006** | AI-Suggested Assignee | `backend/utils/ticketOracle.js` | None | Submit IT request; check if IT specialist is picked. |
| **EP02-ST007** | Automated Draft Record | `backend/routes/ticketRouter.js` | None | Check DB for 'draft' status after submission. |
| **EP03-ST001** | Admin Draft Queue | `frontend/src/DashboardAdmin.jsx` | None | Login as Admin; verify draft queue visibility. |
| **EP03-ST002** | Edit AI Fields | `frontend/src/components/DashboardTicketView.jsx` | None | Modify draft title; verify persistence on blur/save. |
| **EP03-ST003** | Deadline Picker | `frontend/src/components/DashboardTicketView.jsx` | None | Set deadline; check `Ticket` table in DB. |
| **EP03-ST004** | Merge Similar Requests | `backend/routes/ticketRouterAdmin.js` | None | Merge tickets with shared followers; verify success. |
| **EP03-ST005** | Unlink Request | `backend/routes/ticketRouterAdmin.js` | None | Unlink 1 of 2 requests; verify new draft creation. |
| **EP03-ST006** | Submit Draft (Promotion) | `backend/routes/ticketRouterAdmin.js` | None | Click 'Promote'; check status 'New' and followers. |
| **EP04-ST001** | Assignee Workload View | `frontend/src/DashboardAssignee.jsx` | None | Login as specialist; verify ONLY owned tickets show. |
| **EP04-ST002** | Status Update & Enforcement | `backend/routes/ticketRouterAssignee.js` | None | Try 'Solved' without comment; verify 400 rejection. |
| **EP04-ST003** | Status Change History | `backend/database/setup.sql`, `backend/routes/ticketRouterAdmin.js` | None | Change status; verify entries in `TicketHistory` table. |
| **EP04-ST004** | Reassignment | `backend/routes/ticketRouterAssignee.js` | None | Specialist reassign ticket; verify update in DB. |
| **EP04-ST005** | Reassignment History | `backend/routes/ticketRouterAssignee.js` | None | Reassign; check history for prev/new owner logs. |
| **EP05-ST001** | Comment Visibility | `frontend/src/components/DashboardTicketView.jsx` | None | Login as public user; verify internal comments hidden. |
| **EP05-ST002** | Replies / Internal Toggles | `frontend/src/components/DashboardTicketView.jsx` | None | Add public reply; verify creator receives notification. |
| **EP05-ST003** | Stakeholder List | `frontend/src/components/DashboardTicketView.jsx` | None | Verify Creator/Follower/Assignee list visibility. |
| **EP06-ST001** | Grant Assignee Role | `frontend/src/UserManagement.jsx` | None | Toggle user role; verify `perm` level change in DB. |
| **EP06-ST002** | Define Assignee Scope | `backend/routes/assigneeRouter.js` | None | Set 'Database' scope; submit DB ticket; check AI rec. |
| **EP06-ST003** | Admin Global Report | `frontend/src/Report.jsx`, `backend/utils/report.js` | None | Verify volume/avg time/breakdown charts for Admin. |
| **EP06-ST004** | Assignee Personal Report | `frontend/src/Report.jsx`, `backend/utils/report.js` | None | Verify private metrics (own solved count) for Specialist. |
| **EP06-ST005** | Audit Trail Integrity | `backend/database/setup.sql` | None | Attempt to delete history entry (should be restricted). |
| **EP07-ST001** | Professional UI | `frontend/src/styles/` | None | Visual sanity check across all major pages. |
| **EP07-ST002** | Mobile Responsive | `frontend/src/App.jsx` + CSS | None | Resize browser to 360px; verify no horizontal scroll. |
| **EP07-ST003** | 1s/2s Response Times | Backend Optimization | None | Measure load times in Browser Network tab. |
| **EP07-ST004** | HTTPS/SSL | Production Infrastructure | N/A (Local Dev) | N/A (Infrastructure level). |
| **EP07-ST005** | AI < 30s | `backend/utils/ticketOracle.js` | None | Time AI request completion for long messages. |

## Summary of Critical Gaps
1. **AI Refinement**: While functional, AI assignee suggestions could benefit from more detailed scope analysis (current logic uses a flat list of tags).
2. **Real-time Notifications**: Current notifications are email-based; WebSocket integration could provide real-time updates in the dashboard.
3. **Advanced Filter/Search**: Dashboards have basic lists; advanced filtering (by date, priority, category) could be enhanced in the UI.
