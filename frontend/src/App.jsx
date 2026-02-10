import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './HomePage.jsx';
import {useState} from 'react';

const APIDomain = 'http://localhost:5001';

export default function App(){
	return (
		<Router>
			<Routes>
				<Route path="/" element={<Home />} />
			</Routes>
		</Router>
	);
}