/**
 * Assignee Routes — Data Validation Tests
 * Validates: GET /assignee/self-scope
 */
export default async function assigneeValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Assignee Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // GET /assignee/self-scope
    // Schema: { query: { email: email() } }
    // ========================================================================

    // Missing email query param
    try {
        const res = await adminClient.get('/assignee/self-scope');
        assertTrue(res.status === 400, `Expected 400 for missing email query, got ${res.status}`);
        console.log(`  [${res.status}] GET /assignee/self-scope — missing email`);
        recordTest(endpoint('GET /assignee/self-scope — missing email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /assignee/self-scope — missing email'), false, e.message);
    }

    // Invalid email query param
    try {
        const res = await adminClient.get('/assignee/self-scope?email=not-an-email');
        assertTrue(res.status === 400, `Expected 400 for invalid email, got ${res.status}`);
        console.log(`  [${res.status}] GET /assignee/self-scope — invalid email`);
        recordTest(endpoint('GET /assignee/self-scope — invalid email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /assignee/self-scope — invalid email'), false, e.message);
    }

    // Empty email query param
    try {
        const res = await adminClient.get('/assignee/self-scope?email=');
        assertTrue(res.status === 400, `Expected 400 for empty email, got ${res.status}`);
        console.log(`  [${res.status}] GET /assignee/self-scope — empty email`);
        recordTest(endpoint('GET /assignee/self-scope — empty email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET /assignee/self-scope — empty email'), false, e.message);
    }
}
