export default function HomePage({
	redirectToCreateRequestPage,
	redirectToMyRequestsPage, 
	redirectToMyTasksPage, 
	redirectToViewUsersPage, 
	redirectToSystemDashboardPage, 
	redirectToViewTicketsPage
}){
	return (
	<div>
		<button onClick={redirectToCreateRequestPage}>Create Request(User)</button>
		<button onClick={redirectToMyRequestsPage}>My Requests (User)</button>
		<button onClick={redirectToMyTasksPage}>My Tasks (Assignee)</button>
		<button onClick={redirectToViewUsersPage}>View Users (Admin)</button>
		<button onClick={redirectToSystemDashboardPage}>System Dashboard (Admin)</button>
		<button onClick={redirectToViewTicketsPage}>View Tickets (Admin)</button>				
	</div>
);
}