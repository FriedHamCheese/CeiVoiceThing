import express from 'express';
import { getAssigneeOverview } from '../utils/report.js';
import { validateRequest } from '../middleware/validate.js';
import { reportAssigneeSchema } from '../schemas/reportRouter.assignee.schema.js';
import { parseRange } from '../utils/datetime.js';

const router = express.Router();

router.get('/', validateRequest(reportAssigneeSchema), async (request, response) => {
	const email = request.query.email;
	const days = request.query.days;

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