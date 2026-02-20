// backend/routes/reportRouterAdmin.js
import express from 'express';
import { getAssigneeOverview } from '../utils/report.js';

const router = express.Router();

const formatDateOnly = (date) => date.toISOString().slice(0, 10);

const getDefaultRange = () => {
	const end = new Date();
	const start = new Date();
	start.setDate(end.getDate() - 30);
	return {
		startDate: formatDateOnly(start),
		endDate: formatDateOnly(end)
	};
};

const parseRange = (query) => {
	const defaults = getDefaultRange();
	const startDate = query.startDate || defaults.startDate;
	const endDate = query.endDate || defaults.endDate;
	return { startDate, endDate };
};

router.get('/', async (request, response) => {
	const email = request.query.email;
	const days = Math.max(1, parseInt(request.query.days || '30', 10));

	if (!email) {
		return response.status(400).json({ message: 'Missing email.' });
	}

	try {
		const data = await getAssigneeOverview({ email, days });
		response.json({
			range: { days },
			...data
		});
	} catch (error) {
		console.error('Assignee overview error:', error.message, error.stack);
		response.status(500).json({ message: 'Failed to build assignee report.', error: error.message });
	}
});

export default router;