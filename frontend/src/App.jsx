import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './HomePage.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';
import NewTicket from './NewTicket.jsx';
import AssigneeDashboard from './DashboardAssignee.jsx';
import AdminDashboard from './DashboardAdmin.jsx';
import ReportingDashboard from './Report.jsx';
import TrackTicket from './Track.jsx';
import Unauthorized from './components/Unauthorized.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
	return (
		<AuthProvider>
			<Router>
				<Routes>
					{/* Public Routes */}
					<Route path="/login" element={<Login />} />
					<Route path="/unauthorized" element={<Unauthorized />} />
					{/* Protected Routes wrapped in Home Layout */}
					<Route element={<Home />}>
						<Route path="/register" element={<Register />} />
						<Route path="/track-request" element={<TrackTicket />} />
						<Route path="/track/:token" element={<TrackTicket />} />

						<Route element={<ProtectedRoute minRole={1} />}>
							<Route path="/" element={<NewTicket />} />
						</Route>

						<Route element={<ProtectedRoute minRole={2} />}>
							<Route path="/dashboard" element={<AssigneeDashboard />} />
							<Route path="/reports" element={<ReportingDashboard mode="assignee" />} />
						</Route>

						<Route element={<ProtectedRoute minRole={4} />}>
							<Route path="/admin/dashboard" element={<AdminDashboard />} />
							<Route path="/admin/reports" element={<ReportingDashboard mode="admin" />} />
						</Route>
					</Route>

					{/* Catch all - Redirect to Home if logged in, or Login if not */}
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Router>
		</AuthProvider>
	);
}
