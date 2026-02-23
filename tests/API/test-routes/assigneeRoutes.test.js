/**
 * Assignee Router Routes Tests (mounted at /assignee)
 * Tests: GET /assignee/self-scope?email=...
 */
export default async function assigneeRoutesTest({ adminClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('Assignee Router Routes (/assignee)');

    const adminEmail = getShared('adminEmail');

    // --- GET /assignee/self-scope?email=... ---
    if (adminEmail) {
        try {
            const res = await adminClient.get(`/assignee/self-scope?email=${encodeURIComponent(adminEmail)}`);
            assertTrue(res.status === 200, `Expected 200 from GET /assignee/self-scope, got ${res.status}`);
            assertTrue(res.data?.scope !== undefined, 'Expected scope in response');
            assertTrue(Array.isArray(res.data.scope), 'Expected scope to be an array');
            console.log(`  [${res.status}] GET /assignee/self-scope — ${res.data.scope.length} scope tags: [${res.data.scope.join(', ')}]`);
            recordTest('GET /assignee/self-scope', true, `${res.data.scope.length} scope tags`);
        } catch (e) {
            recordTest('GET /assignee/self-scope', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }
    } else {
        console.log('  SKIP: No admin email for assignee scope test');
        recordTest('GET /assignee/self-scope', false, 'Skipped — no email');
    }
}
