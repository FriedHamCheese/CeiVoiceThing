import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './HomePage.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';
import NewTicket from './NewTicket.jsx';
import RequestWithoutLogin from './NewTicketWithoutLogin.jsx';
import AssigneeDashboard from './DashboardAssignee.jsx';
import AdminDashboard from './DashboardAdmin.jsx';
import ReportingDashboard from './Report.jsx';
import TrackTicket from './Track.jsx';
import AssigneeProfile from './AssigneeProfile.jsx';
import UserManagement from './UserManagement.jsx';
import Unauthorized from './components/Unauthorized.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import NotFound from './NotFound.jsx';

export default function App() {
	return (
		<AuthProvider>
			<Router>
				<Routes>
					{/* Public Routes */}
					<Route path="/login" element={<Login />} />
					<Route path="/unauthorized" element={<Unauthorized />} />

					{/* Routes wrapped in Home Layout */}
					<Route element={<Home />}>
						<Route path="/request" element={<RequestWithoutLogin />} />
						<Route path="/register" element={<Register />} />
						<Route path="/track-request" element={<TrackTicket />} />
						<Route path="/request-authed" element={<NewTicket />} />
						<Route path="/track/:token" element={<TrackTicket />} />

						<Route element={<ProtectedRoute minRole={1} />}>
							<Route path="/ticket" element={<NewTicket />} />
						</Route>

						<Route element={<ProtectedRoute minRole={2} />}>
							<Route path="/dashboard" element={<AssigneeDashboard />} />
							<Route path="/reports" element={<ReportingDashboard mode="assignee" />} />
							<Route path="/assignee/profile" element={<AssigneeProfile />} />
						</Route>

						<Route element={<ProtectedRoute minRole={4} />}>
							<Route path="/admin/dashboard" element={<AdminDashboard />} />
							<Route path="/admin/reports" element={<ReportingDashboard mode="admin" />} />
							<Route path="/admin/users" element={<UserManagement />} />
						</Route>
					</Route>

					{/* Catch all - Redirect to 404 */}
					<Route path="*" element={<NotFound />} />
				</Routes>
			</Router>
		</AuthProvider>
	);
}
