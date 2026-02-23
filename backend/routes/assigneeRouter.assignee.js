import express from 'express';
import pool from '../utils/mysqlConnection.js';
import { validateRequest } from '../middleware/validate.js';
import { assigneeGetProfileSchema } from '../schemas/assigneeRouter.assignee.schema.js';

const router = express.Router();

//previously /profile
router.get('/self-scope', validateRequest(assigneeGetProfileSchema), async (request, response) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { email } = request.query;

        const [scope] = await connection.execute(
            "SELECT scopeTag FROM AssigneeScope WHERE userEmail = ?",
            [email]
        );

        response.json({
            scope: scope.map(s => s.scopeTag)
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch scope." });
    } finally {
        if (connection) connection.release();
    }
});

export default router;
