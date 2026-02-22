import {balancerSchema} from '../middleware/validate.js';

/**
 * Selects an assignee for a given scope tag using a round-robin algorithm.
 * Round robin only applies in the same scopeTag.
 * @param {Object} pool - The database connection pool.
 * @param {string} scopeTag - The scope tag to select an assignee for.
 * @param {string} fallbackEmail - The fallback email to use if no assignee is found.
 * @returns {string} The email of the selected assignee or fallbackEmail.
 */
async function getAssigneeForScope(pool, scopeTag, fallbackEmail = "placeholder@example.com") {
    const validated = balancerSchema.safeParse({pool, scopeTag, fallbackEmail});
    if (!validated.success) {
        console.error("getAssigneeForScope Error: ", validated.error.errors);
        return fallbackEmail;
    }
    try{
        // Get connection from pool
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        // Select the user with the least recent assignment
        const [rows] = await connection.execute(`
            SELECT userEmail 
            FROM AssigneeScope 
            WHERE scopeTag = ? 
            ORDER BY last_assigned_at ASC 
            LIMIT 1
        `, [scopeTag]);

        // No assinee with this scopeTag, return fallback email
        if (rows.length === 0) {
            await connection.rollback();
            return fallbackEmail; 
        }

        // Get email from db response.
        const selectedAssignee = rows[0].userEmail;

        // Mark them as "just assigned" so they go to the back of the line
        await connection.execute(`
            UPDATE AssigneeScope 
            SET last_assigned_at = NOW() 
            WHERE userEmail = ? AND scopeTag = ?
        `, [selectedAssignee, scopeTag]);

        await connection.commit();

        return selectedAssignee;
    } catch (error) {
        await connection.rollback();
        console.error("Balancer Error:", error);
        return fallbackEmail;
    } finally {
        connection.release();
    }
}

export default getAssigneeForScope;
