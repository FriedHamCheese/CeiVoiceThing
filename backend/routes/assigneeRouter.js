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

// PUT Profile and Scope
router.put('/profile', async (request, response) => {
    const email = request.user.email;
    const { contact, scope } = request.body;

    let connection;
    try {
        connection = await mysqlConnection.getConnection();
        await connection.beginTransaction();

        // 1. Update/Insert Profile
        await connection.execute(
            "INSERT INTO AssigneeProfile (userEmail, contact) VALUES (?, ?) ON DUPLICATE KEY UPDATE contact = ?",
            [email, contact || "", contact || ""]
        );

        // 2. Update Scope
        await connection.execute("DELETE FROM AssigneeScope WHERE userEmail = ?", [email]);
        if (Array.isArray(scope) && scope.length > 0) {
            const scopeValues = scope.map(tag => [email, tag]);
            await connection.query("INSERT INTO AssigneeScope (userEmail, scopeTag) VALUES ?", [scopeValues]);
        }

        await connection.commit();
        response.json({ message: "Profile updated successfully." });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        response.status(500).json({ error: "Failed to update profile." });
    } finally {
        if (connection) connection.release();
    }
});

export default router;
