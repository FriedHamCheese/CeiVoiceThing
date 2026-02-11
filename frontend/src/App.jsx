import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './HomePage.jsx';
import { useState } from 'react';

import TrackTicket from './TrackTicket.jsx';


export default function App() {
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/track/:token" element={<TrackTicket />} />
			</Routes>
		</Router>
	);
}
