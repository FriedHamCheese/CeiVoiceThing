import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './HomePage.jsx';
import MyRequestsPage from './MyRequestsPage.jsx';
import Dashboard from './ViewTicketsPage.jsx';
import Login from './Login.jsx'
import {useState} from 'react';

const APIDomain = 'http://localhost:5001';

export default function App(){
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/login" element={<Login/>} />
				<Route path="/dashboard" element={<Dashboard />} />
			</Routes>
		</Router>
	);
}