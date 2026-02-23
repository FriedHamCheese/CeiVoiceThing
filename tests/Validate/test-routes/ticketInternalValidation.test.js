/**
 * Ticket Internal Routes — Data Validation Tests
 * Validates: GET /internal/tickets/:id/requests, GET /internal/tickets/:id/history
 */
export default async function ticketInternalValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Ticket Internal Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // GET /internal/tickets/:id/requests
    // Schema: { params: { id: str(min1) } }
    // ========================================================================

    // Whitespace id
    try {
        const res = await adminClient.get('/admin/tickets/%20/requests');
        assertTrue(res.status === 400, `Expected 400 for whitespace id, got ${res.status}`);
        console.log(`  [${res.status}] GET /internal/tickets/:id/requests — whitespace id`);
        recordTest(endpoint('GET /internal/tickets/:id/requests — whitespace id'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /internal/tickets/:id/requests — whitespace id'), false, e.message);
    }

    // ========================================================================
    // GET /internal/tickets/:id/history
    // Schema: { params: { id: str(min1) } }
    // ========================================================================

    // Whitespace id
    try {
        const res = await adminClient.get('/admin/tickets/%20/history');
        assertTrue(res.status === 400, `Expected 400 for whitespace id, got ${res.status}`);
        console.log(`  [${res.status}] GET /internal/tickets/:id/history — whitespace id`);
        recordTest(endpoint('GET /internal/tickets/:id/history — whitespace id'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /internal/tickets/:id/history — whitespace id'), false, e.message);
    }
}
