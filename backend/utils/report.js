import mysqlConnection from './mysqlConnection.js';

const getAdminOverview = async ({ startDate, endDate }) => {
    const dateParams = [startDate, endDate];
    const connection = await mysqlConnection.getConnection();

    try {
        const [[totalRow]] = await connection.execute(
            "SELECT COUNT(*) AS totalTickets FROM Ticket WHERE status != 'draft' AND status != 'merged' AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)",
            dateParams
        );

        const [[resolvedRow]] = await connection.execute(
            "SELECT COUNT(*) AS solvedCount FROM Ticket WHERE status = 'solved' AND status != 'merged' AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)",
            dateParams
        );

        const [[avgRow]] = await connection.execute(
            "SELECT AVG(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) AS avgResolutionHours FROM Ticket WHERE status = 'solved' AND status != 'merged' AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)",
            dateParams
        );

        const [statusRows] = await connection.execute(
            "SELECT status, COUNT(*) AS count FROM Ticket WHERE status != 'draft' AND status != 'merged' AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY status",
            dateParams
        );

        const [volumeByDateRows] = await connection.execute(
            "SELECT DATE(createdAt) AS day, COUNT(*) AS count FROM Ticket WHERE status != 'draft' AND status != 'merged' AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY DATE(createdAt) ORDER BY day ASC",
            dateParams
        );

        const [volumeByCategoryRows] = await connection.execute(
            `SELECT tc.category AS category, COUNT(*) AS count
             FROM TicketCategory tc
             JOIN Ticket t ON t.id = tc.ticketID
             WHERE t.status != 'draft' AND t.createdAt >= ? AND t.createdAt < DATE_ADD(?, INTERVAL 1 DAY)
             GROUP BY tc.category
             ORDER BY count DESC`,
            dateParams
        );

        const [[backlogRow]] = await connection.execute(
            "SELECT COUNT(*) AS backlogCount FROM Ticket WHERE status NOT IN ('solved','failed','draft','merged') AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)",
            dateParams
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
    } finally {
        connection.release();
    }
};

const getAssigneeOverview = async ({ email, days }) => {
    const connection = await mysqlConnection.getConnection();

    try {
        const [[workloadRow]] = await connection.execute(
            `SELECT COUNT(DISTINCT t.id) AS currentWorkload
             FROM Ticket t
             JOIN TicketAssignee ta ON ta.ticketID = t.id
             WHERE ta.assigneeEmail = ?
             AND t.status NOT IN ('solved','failed','draft')`,
            [email]
        );

        const [workloadByStatusRows] = await connection.execute(
            `SELECT t.status AS status, COUNT(DISTINCT t.id) AS count
             FROM Ticket t
             JOIN TicketAssignee ta ON ta.ticketID = t.id
             WHERE ta.assigneeEmail = ?
             AND t.status NOT IN ('solved','failed','draft')
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
    } finally {
        connection.release();
    }
};

export { getAdminOverview, getAssigneeOverview };