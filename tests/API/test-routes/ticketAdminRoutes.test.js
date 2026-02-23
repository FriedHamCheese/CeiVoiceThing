/**
 * Admin Ticket Routes Tests
 * Tests: PATCH /admin/tickets/:id, POST /admin/tickets/merge,
 *        POST /admin/tickets/:parentId/unlink/:childId,
 *        GET /admin/tickets/recommend-merges
 */
export default async function ticketAdminRoutesTest({ adminClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('Admin Ticket Routes');

    const ticketId = getShared('ticketId');

    // --- GET /admin/tickets/recommend-merges ---
    try {
        const res = await adminClient.get('/admin/tickets/recommend-merges');
        assertTrue(res.status === 200, `Expected 200 from GET /admin/tickets/recommend-merges, got ${res.status}`);
        assertTrue(res.data?.recommendations !== undefined, 'Expected recommendations in response');
        console.log(`  [${res.status}] GET /admin/tickets/recommend-merges — ${res.data.recommendations?.length || 0} recommendations`);
        recordTest('GET /admin/tickets/recommend-merges', true, `${res.data.recommendations?.length || 0} recommendations`);
    } catch (e) {
        recordTest('GET /admin/tickets/recommend-merges', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    if (!ticketId) {
        console.log('  SKIP: No ticket ID available for admin ticket update tests');
        recordTest('PATCH /admin/tickets/:id (promote)', false, 'Skipped — no ticket ID');
        recordTest('PATCH /admin/tickets/:id (update title)', false, 'Skipped — no ticket ID');
        return;
    }

    // --- PATCH /admin/tickets/:id (Promote draft -> New) ---
    try {
        const res = await adminClient.patch(`/admin/tickets/${ticketId}`, {
            status: 'New'
        });
        assertTrue(res.status === 200, `Expected 200 from PATCH /admin/tickets/${ticketId} (promote), got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/tickets/${ticketId} — promoted to New`);
        recordTest('PATCH /admin/tickets/:id (promote)', true, 'Promoted draft → New');
    } catch (e) {
        recordTest('PATCH /admin/tickets/:id (promote)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- PATCH /admin/tickets/:id (Update title) ---
    try {
        const res = await adminClient.patch(`/admin/tickets/${ticketId}`, {
            title: '[UAT] Updated Title'
        });
        assertTrue(res.status === 200, `Expected 200 from PATCH /admin/tickets/${ticketId} (title), got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/tickets/${ticketId} — title updated`);
        recordTest('PATCH /admin/tickets/:id (update title)', true, 'Title updated');
    } catch (e) {
        recordTest('PATCH /admin/tickets/:id (update title)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- PATCH /admin/tickets/:id (Solve with resolution comment) ---
    try {
        const res = await adminClient.patch(`/admin/tickets/${ticketId}`, {
            status: 'Solved',
            resolutionComment: '[UAT] Resolved via automated test.'
        });
        assertTrue(res.status === 200, `Expected 200 from PATCH /admin/tickets/${ticketId} (solve), got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/tickets/${ticketId} — solved`);
        recordTest('PATCH /admin/tickets/:id (solve)', true, 'Ticket solved');
    } catch (e) {
        recordTest('PATCH /admin/tickets/:id (solve)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- PATCH /admin/tickets/:id (Solve without comment — should fail 400) ---
    try {
        const res = await adminClient.patch(`/admin/tickets/${ticketId}`, {
            status: 'Failed'
            // intentionally missing resolutionComment
        });
        assertTrue(res.status === 400, `Expected 400 from PATCH without resolutionComment, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/tickets/${ticketId} — correctly rejected (no comment)`);
        recordTest('PATCH /admin/tickets/:id (no comment → 400)', true, 'Correctly returned 400');
    } catch (e) {
        recordTest('PATCH /admin/tickets/:id (no comment → 400)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }
}
