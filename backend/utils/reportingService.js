import mysqlConnection from './mysqlConnection.js';

const getAdminOverview = async ({ startDate, endDate }) => {
    const dateParams = [startDate, endDate];
    const connection = await mysqlConnection.getConnection();

    try {
        const [[totalRow]] = await connection.execute(
            'SELECT COUNT(*) AS totalTickets FROM NewTicket WHERE createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)',
            dateParams
        );

        const [[resolvedRow]] = await connection.execute(
            "SELECT COUNT(*) AS solvedCount FROM NewTicket WHERE status = 'solved' AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)",
            dateParams
        );

        const [[avgRow]] = await connection.execute(
            "SELECT AVG(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) AS avgResolutionHours FROM NewTicket WHERE status = 'solved' AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)",
            dateParams
        );

        const [statusRows] = await connection.execute(
            'SELECT status, COUNT(*) AS count FROM NewTicket WHERE createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY status',
            dateParams
        );

        const [volumeByDateRows] = await connection.execute(
            'SELECT DATE(createdAt) AS day, COUNT(*) AS count FROM NewTicket WHERE createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY DATE(createdAt) ORDER BY day ASC',
            dateParams
        );

        const [volumeByCategoryRows] = await connection.execute(
            `SELECT ntc.category AS category, COUNT(*) AS count
             FROM NewTicketCategory ntc
             JOIN NewTicket nt ON nt.id = ntc.newTicketID
             WHERE nt.createdAt >= ? AND nt.createdAt < DATE_ADD(?, INTERVAL 1 DAY)
             GROUP BY ntc.category
             ORDER BY count DESC`,
            dateParams
        );

        const [[backlogRow]] = await connection.execute(
            "SELECT COUNT(*) AS backlogCount FROM NewTicket WHERE status NOT IN ('solved','failed') AND createdAt >= ? AND createdAt < DATE_ADD(?, INTERVAL 1 DAY)",
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
            `SELECT COUNT(DISTINCT nt.id) AS currentWorkload
             FROM NewTicket nt
             JOIN NewTicketAssignee nta ON nta.newTicketID = nt.id
             WHERE nta.assigneeEmail = ?
             AND nt.status NOT IN ('solved','failed')`,
            [email]
        );

        const [workloadByStatusRows] = await connection.execute(
            `SELECT nt.status AS status, COUNT(DISTINCT nt.id) AS count
             FROM NewTicket nt
             JOIN NewTicketAssignee nta ON nta.newTicketID = nt.id
             WHERE nta.assigneeEmail = ?
             AND nt.status NOT IN ('solved','failed')
             GROUP BY nt.status`,
            [email]
        );

        const [[performanceRow]] = await connection.execute(
            `SELECT
                SUM(CASE WHEN nt.status = 'solved' THEN 1 ELSE 0 END) AS solvedCount,
                SUM(CASE WHEN nt.status = 'failed' THEN 1 ELSE 0 END) AS failedCount
             FROM NewTicket nt
             JOIN NewTicketAssignee nta ON nta.newTicketID = nt.id
             WHERE nta.assigneeEmail = ?
             AND nt.status IN ('solved','failed')
             AND nt.updatedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
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
