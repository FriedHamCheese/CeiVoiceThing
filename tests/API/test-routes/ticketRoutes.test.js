/**
 * Ticket Routes Tests (Authenticated User)
 * Tests: /tickets/request, /tickets/assignees, /tickets/scope,
 *        /tickets/:id/comments, /tickets/:id/comment,
 *        /tickets/:id/is_following, /tickets/:id/follow,
 *        /tickets/requests, /tickets/creator/:ticketID
 */
export default async function ticketRoutesTest({ adminClient, userClient }, { recordTest, assertTrue, printStep, sleep, getShared, setShared }) {
    printStep('Ticket Routes (Authenticated User)');

    const userEmail = getShared('userEmail');

    // --- POST /tickets/request ---
    let trackingToken = null;
    try {
        const res = await userClient.post('/tickets/request', {
            requestText: '[UAT] Automated test request — please ignore.',
            fromEmail: userEmail
        });
        assertTrue(res.status === 200, `Expected 200 from POST /tickets/request, got ${res.status}`);
        assertTrue(typeof res.data?.trackingToken === 'string' && res.data.trackingToken.length > 0, 'Missing trackingToken');
        trackingToken = res.data.trackingToken;
        setShared('trackingToken', trackingToken);
        console.log(`  [${res.status}] POST /tickets/request — token: ${trackingToken}`);
        recordTest('POST /tickets/request', true, `Token: ${trackingToken}`);
    } catch (e) {
        recordTest('POST /tickets/request', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // Wait for ticket creation / AI processing
    await sleep(3000);

    // --- GET /tickets/assignees ---
    try {
        const res = await userClient.get('/tickets/assignees');
        assertTrue(res.status === 200, `Expected 200 from GET /tickets/assignees, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array from /tickets/assignees');
        console.log(`  [${res.status}] GET /tickets/assignees — ${res.data.length} assignees`);
        recordTest('GET /tickets/assignees', true, `${res.data.length} assignees`);
    } catch (e) {
        recordTest('GET /tickets/assignees', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /tickets/scope ---
    try {
        const res = await userClient.get('/tickets/scope');
        assertTrue(res.status === 200, `Expected 200 from GET /tickets/scope, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array from /tickets/scope');
        console.log(`  [${res.status}] GET /tickets/scope — ${res.data.length} tags`);
        recordTest('GET /tickets/scope', true, `${res.data.length} predefined tags`);
    } catch (e) {
        recordTest('GET /tickets/scope', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- POST /tickets/requests (fetch user's tickets) ---
    let ticketId = null;
    try {
        const res = await userClient.post('/tickets/requests', { email: userEmail });
        assertTrue(res.status === 200, `Expected 200 from POST /tickets/requests, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array from /tickets/requests');
        if (res.data.length > 0) {
            ticketId = res.data[0].id;
            setShared('ticketId', ticketId);
        }
        console.log(`  [${res.status}] POST /tickets/requests — ${res.data.length} tickets`);
        recordTest('POST /tickets/requests', true, `${res.data.length} tickets found`);
    } catch (e) {
        recordTest('POST /tickets/requests', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // The following tests need a valid ticket ID
    if (!ticketId) {
        console.log('  SKIP: No ticket ID available for comment/follow tests');
        recordTest('GET /tickets/:id/comments', false, 'Skipped — no ticket ID');
        recordTest('POST /tickets/:id/comment', false, 'Skipped — no ticket ID');
        recordTest('GET /tickets/:id/is_following', false, 'Skipped — no ticket ID');
        recordTest('POST /tickets/:id/follow', false, 'Skipped — no ticket ID');
        recordTest('GET /tickets/creator/:ticketID', false, 'Skipped — no ticket ID');
        return;
    }

    // --- GET /tickets/:id/comments ---
    try {
        const res = await userClient.get(`/tickets/${ticketId}/comments`);
        assertTrue(res.status === 200, `Expected 200 from GET /tickets/${ticketId}/comments, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array of comments');
        console.log(`  [${res.status}] GET /tickets/${ticketId}/comments — ${res.data.length} comments`);
        recordTest('GET /tickets/:id/comments', true, `${res.data.length} comments`);
    } catch (e) {
        recordTest('GET /tickets/:id/comments', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- POST /tickets/:id/comment ---
    try {
        const res = await userClient.post(`/tickets/${ticketId}/comment`, {
            text: '[UAT] Automated test comment',
            isInternal: false
        });
        assertTrue(res.status === 200, `Expected 200 from POST /tickets/${ticketId}/comment, got ${res.status}`);
        console.log(`  [${res.status}] POST /tickets/${ticketId}/comment — comment added`);
        recordTest('POST /tickets/:id/comment', true, 'Comment added');
    } catch (e) {
        recordTest('POST /tickets/:id/comment', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /tickets/:id/is_following ---
    try {
        const res = await userClient.get(`/tickets/${ticketId}/is_following`);
        assertTrue(res.status === 200, `Expected 200 from GET /tickets/${ticketId}/is_following, got ${res.status}`);
        assertTrue(typeof res.data?.isFollowing === 'boolean', 'Expected isFollowing boolean');
        console.log(`  [${res.status}] GET /tickets/${ticketId}/is_following — isFollowing: ${res.data.isFollowing}`);
        recordTest('GET /tickets/:id/is_following', true, `isFollowing: ${res.data.isFollowing}`);
    } catch (e) {
        recordTest('GET /tickets/:id/is_following', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- POST /tickets/:id/follow (toggle) ---
    try {
        const res = await userClient.post(`/tickets/${ticketId}/follow`);
        assertTrue(res.status === 200, `Expected 200 from POST /tickets/${ticketId}/follow, got ${res.status}`);
        assertTrue(typeof res.data?.isFollowing === 'boolean', 'Expected isFollowing boolean');
        console.log(`  [${res.status}] POST /tickets/${ticketId}/follow — toggled to: ${res.data.isFollowing}`);
        recordTest('POST /tickets/:id/follow', true, `Toggled to: ${res.data.isFollowing}`);
    } catch (e) {
        recordTest('POST /tickets/:id/follow', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /tickets/creator/:ticketID ---
    try {
        const res = await userClient.get(`/tickets/creator/${ticketId}`);
        assertTrue(res.status === 200, `Expected 200 from GET /tickets/creator/${ticketId}, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array from /tickets/creator');
        console.log(`  [${res.status}] GET /tickets/creator/${ticketId} — creator found`);
        recordTest('GET /tickets/creator/:ticketID', true, 'Creator info returned');
    } catch (e) {
        recordTest('GET /tickets/creator/:ticketID', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }
}
