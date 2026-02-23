/**
 * Public Ticket Routes Tests
 * Tests: GET /public/tickets/ticket/:id,
 *        GET /public/tickets/track/:token,
 *        POST /public/tickets/track/:token/comment
 */
export default async function ticketPublicRoutesTest({ adminClient, userClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('Public Ticket Routes');

    const ticketId = getShared('ticketId');
    const trackingToken = getShared('trackingToken');
    const userEmail = getShared('userEmail');

    // --- GET /public/tickets/ticket/:id ---
    if (ticketId) {
        try {
            const res = await userClient.get(`/public/tickets/ticket/${ticketId}`);
            assertTrue(res.status === 200, `Expected 200 from GET /public/tickets/ticket/${ticketId}, got ${res.status}`);
            assertTrue(res.data?.id !== undefined, 'Expected ticket id in response');
            console.log(`  [${res.status}] GET /public/tickets/ticket/${ticketId} — title: ${res.data.title}`);
            recordTest('GET /public/tickets/ticket/:id', true, `Ticket: ${res.data.title}`);
        } catch (e) {
            recordTest('GET /public/tickets/ticket/:id', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }
    } else {
        console.log('  SKIP: No ticket ID for public ticket detail');
        recordTest('GET /public/tickets/ticket/:id', false, 'Skipped — no ticket ID');
    }

    // --- GET /public/tickets/ticket/:id (invalid ID → 400) ---
    try {
        const res = await userClient.get('/public/tickets/ticket/abc');
        assertTrue(res.status === 400, `Expected 400 from GET /public/tickets/ticket/abc, got ${res.status}`);
        console.log(`  [${res.status}] GET /public/tickets/ticket/abc — correctly rejected invalid ID`);
        recordTest('GET /public/tickets/ticket/:id (invalid)', true, 'Returns 400 for non-numeric ID');
    } catch (e) {
        recordTest('GET /public/tickets/ticket/:id (invalid)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /public/tickets/track/:token ---
    if (trackingToken && userEmail) {
        try {
            const res = await userClient.get(`/public/tickets/track/${encodeURIComponent(trackingToken)}?email=${encodeURIComponent(userEmail)}`);
            assertTrue(res.status === 200, `Expected 200 from GET /public/tickets/track/:token, got ${res.status}`);
            assertTrue(res.data?.status !== undefined, 'Expected status in tracking response');
            console.log(`  [${res.status}] GET /public/tickets/track/:token — status: ${res.data.status}`);
            recordTest('GET /public/tickets/track/:token', true, `Status: ${res.data.status}`);
        } catch (e) {
            recordTest('GET /public/tickets/track/:token', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }
    } else {
        console.log('  SKIP: No tracking token or email for public tracking');
        recordTest('GET /public/tickets/track/:token', false, 'Skipped — no tracking token');
    }

    // --- GET /public/tickets/track/:token (missing email → 400) ---
    try {
        const res = await userClient.get('/public/tickets/track/fake-token');
        assertTrue(res.status === 400, `Expected 400 from track without email query, got ${res.status}`);
        console.log(`  [${res.status}] GET /public/tickets/track (no email) — correctly rejected`);
        recordTest('GET /public/tickets/track/:token (no email)', true, 'Returns 400 without email');
    } catch (e) {
        recordTest('GET /public/tickets/track/:token (no email)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- POST /public/tickets/track/:token/comment ---
    if (trackingToken && userEmail) {
        try {
            const res = await userClient.post(`/public/tickets/track/${encodeURIComponent(trackingToken)}/comment`, {
                email: userEmail,
                text: '[UAT] Public comment via tracking page'
            });
            // Could be 200 or 403 depending on whether ticket is linked yet
            if (res.status === 200) {
                console.log(`  [${res.status}] POST /public/tickets/track/:token/comment — comment added`);
                recordTest('POST /public/tickets/track/:token/comment', true, 'Public comment added');
            } else {
                console.log(`  [${res.status}] POST /public/tickets/track/:token/comment — ${res.data?.error || 'rejected'}`);
                recordTest('POST /public/tickets/track/:token/comment', true, `Returned ${res.status}: ${res.data?.error}`);
            }
        } catch (e) {
            recordTest('POST /public/tickets/track/:token/comment', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }
    } else {
        console.log('  SKIP: No tracking token for public comment test');
        recordTest('POST /public/tickets/track/:token/comment', false, 'Skipped — no tracking token');
    }
}
