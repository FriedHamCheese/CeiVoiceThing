/**
 * Ticket Admin Routes — Data Validation Tests
 * Validates: PATCH /admin/tickets/:id, POST /admin/tickets/merge,
 *            POST /admin/tickets/:parent/unlink/:child
 */
export default async function ticketAdminValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Ticket Admin Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // PATCH /admin/tickets/:id
    // Schema: { params: { id: str(min1) }, body: { title?, summary?, solution?,
    //           deadline?, categories?: str[], assigneeEmail?: email[], status?,
    //           resolutionComment? } }
    // ========================================================================

    // Invalid assigneeEmail (non-email strings in array)
    try {
        const res = await adminClient.patch('/admin/tickets/1', {
            assigneeEmail: ['not-an-email']
        });
        assertTrue(res.status === 400, `Expected 400 for invalid assigneeEmail, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/tickets/:id — invalid assigneeEmail`);
        recordTest(endpoint('PATCH /admin/tickets/:id — invalid assigneeEmail'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH /admin/tickets/:id — invalid assigneeEmail'), false, e.message);
    }

    // assigneeEmail not an array
    try {
        const res = await adminClient.patch('/admin/tickets/1', {
            assigneeEmail: 'test@example.com'
        });
        assertTrue(res.status === 400, `Expected 400 for non-array assigneeEmail, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/tickets/:id — non-array assigneeEmail`);
        recordTest(endpoint('PATCH /admin/tickets/:id — non-array assigneeEmail'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH /admin/tickets/:id — non-array assigneeEmail'), false, e.message);
    }

    // ========================================================================
    // POST /admin/tickets/merge
    // Schema: { body: { title: str(min1), summary: str(min1),
    //           categories?: str[], suggestedSolutions?: str,
    //           deadline?: str|null, assigneeEmails?: email[],
    //           draftTicketIDs: int[](min1) } }
    // ========================================================================

    // Empty body
    try {
        const res = await adminClient.post('/admin/tickets/merge', {});
        assertTrue(res.status === 400, `Expected 400 for empty merge body, got ${res.status}`);
        console.log(`  [${res.status}] POST /admin/tickets/merge — empty body`);
        recordTest(endpoint('POST /admin/tickets/merge — empty body'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /admin/tickets/merge — empty body'), false, e.message);
    }

    // Missing title
    try {
        const res = await adminClient.post('/admin/tickets/merge', {
            summary: 'Test summary',
            draftTicketIDs: [1]
        });
        assertTrue(res.status === 400, `Expected 400 for missing title, got ${res.status}`);
        console.log(`  [${res.status}] POST /admin/tickets/merge — missing title`);
        recordTest(endpoint('POST /admin/tickets/merge — missing title'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /admin/tickets/merge — missing title'), false, e.message);
    }

    // Missing summary
    try {
        const res = await adminClient.post('/admin/tickets/merge', {
            title: 'Test title',
            draftTicketIDs: [1]
        });
        assertTrue(res.status === 400, `Expected 400 for missing summary, got ${res.status}`);
        console.log(`  [${res.status}] POST /admin/tickets/merge — missing summary`);
        recordTest(endpoint('POST /admin/tickets/merge — missing summary'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /admin/tickets/merge — missing summary'), false, e.message);
    }

    // Empty draftTicketIDs array
    try {
        const res = await adminClient.post('/admin/tickets/merge', {
            title: 'Test title',
            summary: 'Test summary',
            draftTicketIDs: []
        });
        assertTrue(res.status === 400, `Expected 400 for empty draftTicketIDs, got ${res.status}`);
        console.log(`  [${res.status}] POST /admin/tickets/merge — empty draftTicketIDs`);
        recordTest(endpoint('POST /admin/tickets/merge — empty draftTicketIDs'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /admin/tickets/merge — empty draftTicketIDs'), false, e.message);
    }

    // Non-integer draftTicketIDs
    try {
        const res = await adminClient.post('/admin/tickets/merge', {
            title: 'Test title',
            summary: 'Test summary',
            draftTicketIDs: ['abc', 'def']
        });
        assertTrue(res.status === 400, `Expected 400 for non-integer draftTicketIDs, got ${res.status}`);
        console.log(`  [${res.status}] POST /admin/tickets/merge — non-integer draftTicketIDs`);
        recordTest(endpoint('POST /admin/tickets/merge — non-integer draftTicketIDs'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /admin/tickets/merge — non-integer draftTicketIDs'), false, e.message);
    }

    // Float draftTicketIDs (not int)
    try {
        const res = await adminClient.post('/admin/tickets/merge', {
            title: 'Test title',
            summary: 'Test summary',
            draftTicketIDs: [1.5, 2.7]
        });
        assertTrue(res.status === 400, `Expected 400 for float draftTicketIDs, got ${res.status}`);
        console.log(`  [${res.status}] POST /admin/tickets/merge — float draftTicketIDs`);
        recordTest(endpoint('POST /admin/tickets/merge — float draftTicketIDs'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /admin/tickets/merge — float draftTicketIDs'), false, e.message);
    }

    // Invalid assigneeEmails in merge
    try {
        const res = await adminClient.post('/admin/tickets/merge', {
            title: 'Test title',
            summary: 'Test summary',
            draftTicketIDs: [1],
            assigneeEmails: ['not-email']
        });
        assertTrue(res.status === 400, `Expected 400 for invalid assigneeEmails, got ${res.status}`);
        console.log(`  [${res.status}] POST /admin/tickets/merge — invalid assigneeEmails`);
        recordTest(endpoint('POST /admin/tickets/merge — invalid assigneeEmails'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /admin/tickets/merge — invalid assigneeEmails'), false, e.message);
    }

    // ========================================================================
    // POST /admin/tickets/:parentTicketId/unlink/:childUserRequestID
    // Schema: { params: { parentTicketId: str(min1), childUserRequestID: str(min1) } }
    // ========================================================================

    // Whitespace parentTicketId
    try {
        const res = await adminClient.post('/admin/tickets/%20/unlink/1');
        assertTrue(res.status === 400, `Expected 400 for whitespace parentTicketId, got ${res.status}`);
        console.log(`  [${res.status}] POST unlink — whitespace parentTicketId`);
        recordTest(endpoint('POST unlink — whitespace parentTicketId'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST unlink — whitespace parentTicketId'), false, e.message);
    }

    // Whitespace childUserRequestID
    try {
        const res = await adminClient.post('/admin/tickets/1/unlink/%20');
        assertTrue(res.status === 400, `Expected 400 for whitespace childUserRequestID, got ${res.status}`);
        console.log(`  [${res.status}] POST unlink — whitespace childUserRequestID`);
        recordTest(endpoint('POST unlink — whitespace childUserRequestID'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST unlink — whitespace childUserRequestID'), false, e.message);
    }
}
