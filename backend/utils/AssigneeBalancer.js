export default class AssigneeBalancer {
    constructor(dbPool) {
        this.pool = dbPool;
    }

    async getAssigneeForScope(scopeTag) {
        // 1. Find the person who hasn't had a ticket for the longest time
        // If last_assigned_at is NULL, they come first (ASC order handles NULLs first usually, or use COALESCE)
        const selectSql = `
            SELECT userEmail 
            FROM AssigneeScope 
            WHERE scopeTag = ? 
            ORDER BY last_assigned_at ASC 
            LIMIT 1
        `;

        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [rows] = await connection.execute(selectSql, [scopeTag]);

            if (rows.length === 0) {
                await connection.rollback();
                return null; 
            }

            const selectedAgent = rows[0].userEmail;

            // 2. Mark them as "just assigned" so they go to the back of the line
            const updateSql = `
                UPDATE AssigneeScope 
                SET last_assigned_at = NOW() 
                WHERE userEmail = ? AND scopeTag = ?
            `;
            
            await connection.execute(updateSql, [selectedAgent, scopeTag]);
            
            await connection.commit();
            
            console.log(`⚖️  DB-Balanced '${scopeTag}': Assigned to ${selectedAgent}`);
            return selectedAgent;

        } catch (error) {
            await connection.rollback();
            console.error("Balancer Error:", error);
            return null;
        } finally {
            connection.release();
        }
    }
}