import express from 'express';
import mysqlConnection from '../utils/mysqlConnection.js';
import { validateRequest } from '../middleware/validate.js';
import { adminPatchUserSchema } from '../schemas/adminRouter.admin.schema.js';

const router = express.Router();

/**
 * GET /admin/users
 * Fetch all registered users for administration.
 */
router.get('/users', async (req, res) => {
    try {
        const [rows] = await mysqlConnection.execute(
            'SELECT email, name, perm FROM Users ORDER BY name ASC'
        );
        res.json({ success: true, users: rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

/**
 * PATCH /admin/users/:email/role
 * Update the permission level (role) for a specific user.
 */
router.patch('/users/:email/role', validateRequest(adminPatchUserSchema), async (req, res) => {
    const { email } = req.params;
    const { perm } = req.body;

    try {
        const [result] = await mysqlConnection.execute(
            'UPDATE Users SET perm = ? WHERE email = ?',
            [perm, email]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: `User ${email} role updated to ${perm}` });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ success: false, message: 'Failed to update user role' });
    }
});

export default router;
