/**
 * Ticket Public Routes — Data Validation Tests
 * Validates: GET /public/tickets/ticket/:id, GET /public/tickets/track/:token,
 *            POST /public/tickets/track/:token/comment
 * (These routes use inline validation rather than Zod, but we still test input rejection)
 */
export default async function ticketPublicValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Ticket Public Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // GET /public/tickets/ticket/:id
    // Inline: parseInt(id) → if NaN → 400
    // ========================================================================

    // Non-numeric id
    try {
        const res = await adminClient.get('/public/tickets/ticket/abc');
        assertTrue(res.status === 400, `Expected 400 for non-numeric id, got ${res.status}`);
        console.log(`  [${res.status}] GET /public/tickets/ticket/:id — non-numeric id`);
        recordTest(endpoint('GET /public/ticket/:id — non-numeric id'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /public/ticket/:id — non-numeric id'), false, e.message);
    }

    // Special characters in id
    try {
        const res = await adminClient.get('/public/tickets/ticket/!@%23');
        assertTrue(res.status === 400, `Expected 400 for special chars in id, got ${res.status}`);
        console.log(`  [${res.status}] GET /public/tickets/ticket/:id — special chars`);
        recordTest(endpoint('GET /public/ticket/:id — special chars'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /public/ticket/:id — special chars'), false, e.message);
    }

    // ========================================================================
    // GET /public/tickets/track/:token
    // Inline: if (!token || !email) → 400
    // ========================================================================

    // Missing email query param
    try {
        const res = await adminClient.get('/public/tickets/track/some-token');
        assertTrue(res.status === 400, `Expected 400 for missing email query, got ${res.status}`);
        console.log(`  [${res.status}] GET /public/tickets/track/:token — missing email`);
        recordTest(endpoint('GET /public/track/:token — missing email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /public/track/:token — missing email'), false, e.message);
    }

    // Empty email query param
    try {
        const res = await adminClient.get('/public/tickets/track/some-token?email=');
        assertTrue(res.status === 400, `Expected 400 for empty email query, got ${res.status}`);
        console.log(`  [${res.status}] GET /public/tickets/track/:token — empty email`);
        recordTest(endpoint('GET /public/track/:token — empty email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /public/track/:token — empty email'), false, e.message);
    }

    // ========================================================================
    // POST /public/tickets/track/:token/comment
    // Inline: if (!text) → 400
    // ========================================================================

    // Missing text in body
    try {
        const res = await adminClient.post('/public/tickets/track/some-token/comment', {
            email: 'user@example.com'
        });
        assertTrue(res.status === 400, `Expected 400 for missing text, got ${res.status}`);
        console.log(`  [${res.status}] POST /public/track/:token/comment — missing text`);
        recordTest(endpoint('POST /public/track/comment — missing text'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /public/track/comment — missing text'), false, e.message);
    }

    // Empty text in body
    try {
        const res = await adminClient.post('/public/tickets/track/some-token/comment', {
            email: 'user@example.com',
            text: ''
        });
        assertTrue(res.status === 400, `Expected 400 for empty text, got ${res.status}`);
        console.log(`  [${res.status}] POST /public/track/:token/comment — empty text`);
        recordTest(endpoint('POST /public/track/comment — empty text'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /public/track/comment — empty text'), false, e.message);
    }
}
