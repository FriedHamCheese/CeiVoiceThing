import pool from './mysqlConnection.js';

/**
 * Gets the overview of the admin
 * @param {{startDate: string, endDate: string}} 
 * @returns {{totals: {totalTickets: number, solvedCount: number, avgResolutionHours: number, backlogCount: number}, statusBreakdown: {status: string, count: number}[], volumeByDate: {day: string, count: number}[], volumeByCategory: {category: string, count: number}[], backlogCount: number}}
 */
const getAdminOverview = async ({ startDate, endDate, category, status }) => {
    const connection = await pool.getConnection();

    try {
        let baseWhere = "t.status != 'draft' AND t.status != 'merged' AND t.createdAt >= ? AND t.createdAt < DATE_ADD(?, INTERVAL 1 DAY)";
        const baseParams = [startDate, endDate];
        let joinStr = "";

        if (status) {
            baseWhere += " AND t.status = ?";
            baseParams.push(status);
        }

        if (category) {
            joinStr = "JOIN TicketCategory tc_filter ON tc_filter.ticketID = t.id";
            baseWhere += " AND tc_filter.category = ?";
            baseParams.push(category);
        }

        const [[totalRow]] = await connection.execute(
            `SELECT COUNT(DISTINCT t.id) AS totalTickets FROM Ticket t ${joinStr} WHERE ${baseWhere}`,
            baseParams
        );

        const [[resolvedRow]] = await connection.execute(
            `SELECT COUNT(DISTINCT t.id) AS solvedCount FROM Ticket t ${joinStr} WHERE ${baseWhere} AND t.status = 'solved'`,
            baseParams
        );

        const [[avgRow]] = await connection.execute(
            `SELECT 
                AVG(TIMESTAMPDIFF(SECOND, t.createdAt, t.updatedAt)) / 3600 AS avgResolutionHours 
            FROM Ticket t ${joinStr} 
            WHERE ${baseWhere} AND t.status = 'solved'`,
            baseParams
        );
        const [statusRows] = await connection.execute(
            `SELECT t.status, COUNT(DISTINCT t.id) AS count FROM Ticket t ${joinStr} WHERE ${baseWhere} GROUP BY t.status`,
            baseParams
        );

        const [volumeByDateRows] = await connection.execute(
            `SELECT DATE(t.createdAt) AS day, COUNT(DISTINCT t.id) AS count FROM Ticket t ${joinStr} WHERE ${baseWhere} GROUP BY DATE(t.createdAt) ORDER BY day ASC`,
            baseParams
        );

        const [volumeByCategoryRows] = await connection.execute(
            `SELECT tc.category AS category, COUNT(DISTINCT t.id) AS count
             FROM Ticket t
             ${joinStr}
             JOIN TicketCategory tc ON t.id = tc.ticketID
             WHERE ${baseWhere}
             GROUP BY tc.category
             ORDER BY count DESC`,
            baseParams
        );

        const [[backlogRow]] = await connection.execute(
            `SELECT COUNT(DISTINCT t.id) AS backlogCount FROM Ticket t ${joinStr} WHERE ${baseWhere} AND t.status NOT IN ('solved','failed')`,
            baseParams
        );

        return {
            totals: {
                totalTickets: totalRow.totalTickets || 0,
                solvedCount: resolvedRow.solvedCount || 0,
                avgResolutionHours: avgRow.avgResolutionHours || 0,
                backlogCount: backlogRow.backlogCount || 0,
            },
            statusBreakdown: statusRows,
            volumeByDate: volumeByDateRows,
            volumeByCategory: volumeByCategoryRows,
        };
    } catch (error) {
        console.error("getAdminOverview Error: ", error);
        return { error: "Internal server error" };
    } finally {
        connection.release();
    }
};

/**
 * Gets the overview of a specific assignee
 * @param {{email: string, days: number}} param0 
 * @returns {{totals: {currentWorkload: number, solvedCount: number, failedCount: number}, workloadByStatus: {status: string, count: number}[]}}
 */
const getAssigneeOverview = async ({ email, days }) => {
    const connection = await pool.getConnection();

    try {
        const [[workloadRow]] = await connection.execute(
            `SELECT COUNT(DISTINCT t.id) AS currentWorkload
             FROM Ticket t
             JOIN TicketAssignee ta ON ta.ticketID = t.id
             WHERE ta.assigneeEmail = ?
             AND t.status NOT IN ('solved', 'failed', 'draft', 'merged')`,
            [email]
        );

        const [workloadByStatusRows] = await connection.execute(
            `SELECT t.status AS status, COUNT(DISTINCT t.id) AS count
             FROM Ticket t
             JOIN TicketAssignee ta ON ta.ticketID = t.id
             WHERE ta.assigneeEmail = ?
             AND t.status NOT IN ('solved', 'failed', 'draft', 'merged')
             GROUP BY t.status`,
            [email]
        );

        const [[performanceRow]] = await connection.execute(
            `SELECT
                SUM(CASE WHEN t.status = 'solved' THEN 1 ELSE 0 END) AS solvedCount,
                SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END) AS failedCount
             FROM Ticket t
             JOIN TicketAssignee ta ON ta.ticketID = t.id
             WHERE ta.assigneeEmail = ?
             AND t.status IN ('solved','failed')
             AND t.updatedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [email, days]
        );

        return {
            totals: {
                currentWorkload: workloadRow.currentWorkload || 0,
                solvedCount: performanceRow.solvedCount || 0,
                failedCount: performanceRow.failedCount || 0,
            },
            workloadByStatus: workloadByStatusRows,
        };
    } catch (error) {
        console.error("getAssigneeOverview Error: ", error);
        return { error: "Internal server error" };
    } finally {
        connection.release();
    }
};

export { getAdminOverview, getAssigneeOverview };