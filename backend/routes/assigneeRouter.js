// backend/routes/assigneeRouter.js
import express from 'express';
import mysqlConnection from '../utils/mysqlConnection.js';

const router = express.Router();

// GET Profile and Scope
router.get('/profile', async (request, response) => {
    const email = request.user.email;
    try {
        const [profile] = await mysqlConnection.execute(
            "SELECT contact FROM AssigneeProfile WHERE userEmail = ?",
            [email]
        );
        const [scope] = await mysqlConnection.execute(
            "SELECT scopeTag FROM AssigneeScope WHERE userEmail = ?",
            [email]
        );

        response.json({
            email,
            name: request.user.name || email.split('@')[0],
            contact: profile[0]?.contact || "",
            scope: scope.map(s => s.scopeTag)
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch profile." });
    }
});

export default router;
