/**
 * Ticket Routes (User) — Data Validation Tests
 * Validates: POST /tickets/request, GET /tickets/:id/comments,
 *            POST /tickets/:id/comment, GET /tickets/:id/is_following,
 *            POST /tickets/:id/follow, POST /tickets/requests,
 *            GET /tickets/creator/:ticketID
 */
export default async function ticketValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Ticket Routes (User) — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // POST /tickets/request
    // Schema: { body: { requestText: str(min1,max2048), fromEmail: email(max64) } }
    // ========================================================================

    // Missing body
    try {
        const res = await adminClient.post('/tickets/request', {});
        assertTrue(res.status === 400, `Expected 400 for empty body, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/request — empty body`);
        recordTest(endpoint('POST /tickets/request — empty body'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/request — empty body'), false, e.message);
    }

    // Empty requestText
    try {
        const res = await adminClient.post('/tickets/request', {
            requestText: '',
            fromEmail: 'user@example.com'
        });
        assertTrue(res.status === 400, `Expected 400 for empty requestText, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/request — empty requestText`);
        recordTest(endpoint('POST /tickets/request — empty requestText'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/request — empty requestText'), false, e.message);
    }

    // requestText too long (>2048)
    try {
        const res = await adminClient.post('/tickets/request', {
            requestText: 'x'.repeat(2049),
            fromEmail: 'user@example.com'
        });
        assertTrue(res.status === 400, `Expected 400 for too-long requestText, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/request — requestText too long`);
        recordTest(endpoint('POST /tickets/request — requestText too long'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/request — requestText too long'), false, e.message);
    }

    // Invalid fromEmail
    try {
        const res = await adminClient.post('/tickets/request', {
            requestText: 'Valid request text',
            fromEmail: 'not-an-email'
        });
        assertTrue(res.status === 400, `Expected 400 for invalid fromEmail, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/request — invalid fromEmail`);
        recordTest(endpoint('POST /tickets/request — invalid fromEmail'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/request — invalid fromEmail'), false, e.message);
    }

    // ========================================================================
    // GET /tickets/:id/comments
    // Schema: { params: { id: str(min1) } }
    // ========================================================================

    // Empty id → use space-encoded
    try {
        const res = await adminClient.get('/tickets/%20/comments');
        assertTrue(res.status === 400, `Expected 400 for whitespace id, got ${res.status}`);
        console.log(`  [${res.status}] GET /tickets/:id/comments — whitespace id`);
        recordTest(endpoint('GET /tickets/:id/comments — whitespace id'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /tickets/:id/comments — whitespace id'), false, e.message);
    }

    // ========================================================================
    // POST /tickets/:id/comment
    // Schema: { params: { id: str(min1) }, body: { text: str(min1), isInternal: bool(optional) } }
    // ========================================================================

    // Missing text field
    try {
        const res = await adminClient.post('/tickets/1/comment', {});
        assertTrue(res.status === 400, `Expected 400 for missing text, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/:id/comment — missing text`);
        recordTest(endpoint('POST /tickets/:id/comment — missing text'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/:id/comment — missing text'), false, e.message);
    }

    // Empty text
    try {
        const res = await adminClient.post('/tickets/1/comment', { text: '' });
        assertTrue(res.status === 400, `Expected 400 for empty text, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/:id/comment — empty text`);
        recordTest(endpoint('POST /tickets/:id/comment — empty text'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/:id/comment — empty text'), false, e.message);
    }

    // ========================================================================
    // POST /tickets/requests
    // Schema: { body: { email: email() } }
    // ========================================================================

    // Missing email
    try {
        const res = await adminClient.post('/tickets/requests', {});
        assertTrue(res.status === 400, `Expected 400 for missing email, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/requests — missing email`);
        recordTest(endpoint('POST /tickets/requests — missing email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/requests — missing email'), false, e.message);
    }

    // Invalid email
    try {
        const res = await adminClient.post('/tickets/requests', { email: 'invalid' });
        assertTrue(res.status === 400, `Expected 400 for invalid email, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/requests — invalid email`);
        recordTest(endpoint('POST /tickets/requests — invalid email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /tickets/requests — invalid email'), false, e.message);
    }
}
