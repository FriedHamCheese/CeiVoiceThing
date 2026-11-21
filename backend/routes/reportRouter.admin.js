import express from 'express';
import { getAdminOverview } from '../utils/report.js';
import { validateRequest } from '../middleware/validate.js';
import { reportAdminSchema } from '../schemas/reportRouter.admin.schema.js';
import { parseRange } from '../utils/datetime.js';

const router = express.Router();

router.get('/', validateRequest(reportAdminSchema), async (request, response) => {
	try {
		const { startDate, endDate } = parseRange(request.query);
		const { category, status } = request.query;
		const data = await getAdminOverview({ startDate, endDate, category, status });
		response.json({
			range: { startDate, endDate },
			...data
		});
	} catch (error) {
		console.error('Admin overview error:', error.message, error.stack);
		response.status(500).json({ message: 'Failed to build admin report.', error: error.message });
	}
});

export default router;