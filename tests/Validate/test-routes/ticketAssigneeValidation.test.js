/**
 * Ticket Assignee Routes — Data Validation Tests
 * Validates: PATCH /assignee/tickets/:id, GET /assignee/tickets/:id/history
 */
export default async function ticketAssigneeValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Ticket Assignee Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // PATCH /assignee/tickets/:id
    // Schema: { params: { id: str(min1) }, body: { status?, resolutionComment?,
    //           assigneeEmail?: email[] } }
    // ========================================================================

    // Invalid assigneeEmail (non-email strings)
    try {
        const res = await adminClient.patch('/assignee/tickets/1', {
            assigneeEmail: ['not-an-email']
        });
        assertTrue(res.status === 400, `Expected 400 for invalid assigneeEmail, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /assignee/tickets/:id — invalid assigneeEmail`);
        recordTest(endpoint('PATCH /assignee/tickets/:id — invalid assigneeEmail'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH /assignee/tickets/:id — invalid assigneeEmail'), false, e.message);
    }

    // assigneeEmail not an array
    try {
        const res = await adminClient.patch('/assignee/tickets/1', {
            assigneeEmail: 'single@email.com'
        });
        assertTrue(res.status === 400, `Expected 400 for non-array assigneeEmail, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /assignee/tickets/:id — non-array assigneeEmail`);
        recordTest(endpoint('PATCH /assignee/tickets/:id — non-array assigneeEmail'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH /assignee/tickets/:id — non-array assigneeEmail'), false, e.message);
    }

    // Mixed valid/invalid emails
    try {
        const res = await adminClient.patch('/assignee/tickets/1', {
            assigneeEmail: ['valid@email.com', 'bad-email']
        });
        assertTrue(res.status === 400, `Expected 400 for mixed emails, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /assignee/tickets/:id — mixed valid/invalid emails`);
        recordTest(endpoint('PATCH /assignee/tickets/:id — mixed emails'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH /assignee/tickets/:id — mixed emails'), false, e.message);
    }

    // ========================================================================
    // GET /assignee/tickets/:id/history
    // Schema: { params: { id: str(min1) } }
    // ========================================================================

    // Whitespace id
    try {
        const res = await adminClient.get('/assignee/tickets/%20/history');
        assertTrue(res.status === 400, `Expected 400 for whitespace id, got ${res.status}`);
        console.log(`  [${res.status}] GET /assignee/tickets/:id/history — whitespace id`);
        recordTest(endpoint('GET /assignee/tickets/:id/history — whitespace id'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /assignee/tickets/:id/history — whitespace id'), false, e.message);
    }
}
