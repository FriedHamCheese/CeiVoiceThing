/**
 * Internal Ticket Routes Tests (Admin/Assignee shared)
 * Tests: GET /admin/tickets (list), GET /admin/tickets/:id/requests,
 *        GET /admin/tickets/assignees, GET /admin/tickets/:id/history
 */
export default async function ticketInternalRoutesTest({ adminClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('Internal Ticket Routes (via /admin/tickets)');

    const ticketId = getShared('ticketId');

    // --- GET /admin/tickets (List all) ---
    try {
        const res = await adminClient.get('/admin/tickets');
        assertTrue(res.status === 200, `Expected 200 from GET /admin/tickets, got ${res.status}`);
        assertTrue(res.data?.tickets !== undefined, 'Expected tickets in response');
        assertTrue(Array.isArray(res.data.tickets), 'Expected tickets to be an array');
        console.log(`  [${res.status}] GET /admin/tickets — ${res.data.tickets.length} tickets`);
        recordTest('GET /admin/tickets (list)', true, `${res.data.tickets.length} tickets`);
    } catch (e) {
        recordTest('GET /admin/tickets (list)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /admin/tickets/assignees ---
    try {
        const res = await adminClient.get('/admin/tickets/assignees');
        assertTrue(res.status === 200, `Expected 200 from GET /admin/tickets/assignees, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array of assignees');
        console.log(`  [${res.status}] GET /admin/tickets/assignees — ${res.data.length} assignees`);
        recordTest('GET /admin/tickets/assignees', true, `${res.data.length} assignees`);
    } catch (e) {
        recordTest('GET /admin/tickets/assignees', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    if (!ticketId) {
        console.log('  SKIP: No ticket ID for linked requests and history');
        recordTest('GET /admin/tickets/:id/requests', false, 'Skipped — no ticket ID');
        recordTest('GET /admin/tickets/:id/history', false, 'Skipped — no ticket ID');
        return;
    }

    // --- GET /admin/tickets/:id/requests ---
    try {
        const res = await adminClient.get(`/admin/tickets/${ticketId}/requests`);
        assertTrue(res.status === 200, `Expected 200 from GET /admin/tickets/${ticketId}/requests, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array of linked requests');
        console.log(`  [${res.status}] GET /admin/tickets/${ticketId}/requests — ${res.data.length} requests`);
        recordTest('GET /admin/tickets/:id/requests', true, `${res.data.length} linked requests`);
    } catch (e) {
        recordTest('GET /admin/tickets/:id/requests', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /admin/tickets/:id/history ---
    try {
        const res = await adminClient.get(`/admin/tickets/${ticketId}/history`);
        assertTrue(res.status === 200, `Expected 200 from GET /admin/tickets/${ticketId}/history, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array of history entries');
        console.log(`  [${res.status}] GET /admin/tickets/${ticketId}/history — ${res.data.length} entries`);
        recordTest('GET /admin/tickets/:id/history', true, `${res.data.length} history entries`);
    } catch (e) {
        recordTest('GET /admin/tickets/:id/history', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }
}
