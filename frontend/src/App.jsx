import HomePage from './HomePage.jsx';
import MyRequestsPage from './MyRequestsPage.jsx';
import ViewTicketsPage from './ViewTicketsPage.jsx';
import {useState} from 'react';

const APIDomain = 'http://localhost:5001';

export default function App(){
	//Gonna keep this separated from App's return in case App has header or footer
	function SelectedPage(){
		const [currentPage, setCurrentPage] = useState('Home');
		switch(currentPage){
			case 'Home':
				return <HomePage
					redirectToMyRequestsPage = {() => setCurrentPage('MyRequests')}
					redirectToMyTasksPage = {() => setCurrentPage('MyTasks')}
					redirectToViewUsersPage = {() => setCurrentPage('ViewUsers')}
					redirectToSystemDashboardPage = {() => setCurrentPage('SystemDashboard')}
					redirectToViewTicketsPage = {() => setCurrentPage('ViewTickets')}
				/>;
			case 'MyRequests':
				return <MyRequestsPage
					redirectToHomePage = {() => setCurrentPage('Home')}
				/>;
			case 'ViewTickets':
				return <ViewTicketsPage
					redirectToHomePage = {() => setCurrentPage('Home')}
					APIDomain={APIDomain}
				/>
			default: return (
				<div>
					<h2>{currentPage} not implemented or handled.</h2>
					<button onClick={() => setCurrentPage('Home')}>To Home</button>
				</div>
			);
		}
	}

	return (
		<SelectedPage/>
	);
}