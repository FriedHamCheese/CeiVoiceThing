/**
 * Assignee Ticket Routes Tests
 * Tests: PATCH /assignee/tickets/:id, GET /assignee/tickets/:id/history
 */
export default async function ticketAssigneeRoutesTest({ adminClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('Assignee Ticket Routes');

    // We use adminClient here because both admin and assignee share perm >= 2.
    // The admin role (perm=4) satisfies restrictTo(ROLES.ASSIGNEE) if ASSIGNEE = 2
    // and the middleware checks perm >= ROLES.ASSIGNEE, or the admin has both roles.
    // If this doesn't work for your setup, you'd need a separate assignee login.

    const ticketId = getShared('ticketId');

    if (!ticketId) {
        console.log('  SKIP: No ticket ID available for assignee ticket tests');
        recordTest('PATCH /assignee/tickets/:id', false, 'Skipped — no ticket ID');
        recordTest('GET /assignee/tickets/:id/history', false, 'Skipped — no ticket ID');
        return;
    }

    // --- GET /assignee/tickets/:id/history ---
    try {
        const res = await adminClient.get(`/assignee/tickets/${ticketId}/history`);
        assertTrue(res.status === 200, `Expected 200 from GET /assignee/tickets/${ticketId}/history, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array of history entries');
        console.log(`  [${res.status}] GET /assignee/tickets/${ticketId}/history — ${res.data.length} entries`);
        recordTest('GET /assignee/tickets/:id/history', true, `${res.data.length} history entries`);
    } catch (e) {
        recordTest('GET /assignee/tickets/:id/history', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- PATCH /assignee/tickets/:id (update status) ---
    try {
        const res = await adminClient.patch(`/assignee/tickets/${ticketId}`, {
            resolutionComment: '[UAT] Assignee resolution test comment'
        });
        assertTrue(res.status === 200, `Expected 200 from PATCH /assignee/tickets/${ticketId}, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /assignee/tickets/${ticketId} — updated resolution comment`);
        recordTest('PATCH /assignee/tickets/:id', true, 'Resolution comment updated');
    } catch (e) {
        recordTest('PATCH /assignee/tickets/:id', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }
}
