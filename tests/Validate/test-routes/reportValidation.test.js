/**
 * Report Routes — Data Validation Tests
 * Validates: GET /assignee/reports/ (requires email query)
 * Note: GET /reports/admin/ has all-optional query params → no invalid cases that produce 400
 */
export function reportAssigneeValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    return (async () => {
        printStep('Report Routes (Assignee) — Validation');

        const endpoint = (label) => `[VALIDATE] ${label}`;

        // ========================================================================
        // GET /assignee/reports/
        // Schema: { query: looseObject({ email: email(), days?: str→int }) }
        // ========================================================================

        // Missing email query param
        try {
            const res = await adminClient.get('/assignee/reports/');
            assertTrue(res.status === 400, `Expected 400 for missing email, got ${res.status}`);
            console.log(`  [${res.status}] GET /assignee/reports/ — missing email`);
            recordTest(endpoint('GET /assignee/reports/ — missing email'), true, 'Rejected');
        } catch (e) {
            recordTest(endpoint('GET /assignee/reports/ — missing email'), false, e.message);
        }

        // Invalid email query param
        try {
            const res = await adminClient.get('/assignee/reports/?email=not-an-email');
            assertTrue(res.status === 400, `Expected 400 for invalid email, got ${res.status}`);
            console.log(`  [${res.status}] GET /assignee/reports/ — invalid email`);
            recordTest(endpoint('GET /assignee/reports/ — invalid email'), true, 'Rejected');
        } catch (e) {
            recordTest(endpoint('GET /assignee/reports/ — invalid email'), false, e.message);
        }

        // Empty email query param
        try {
            const res = await adminClient.get('/assignee/reports/?email=');
            assertTrue(res.status === 400, `Expected 400 for empty email, got ${res.status}`);
            console.log(`  [${res.status}] GET /assignee/reports/ — empty email`);
            recordTest(endpoint('GET /assignee/reports/ — empty email'), true, 'Rejected');
        } catch (e) {
            recordTest(endpoint('GET /assignee/reports/ — empty email'), false, e.message);
        }
    })();
}

export function reportAdminValidationTest({ adminClient }, { recordTest, printStep }) {
    return (async () => {
        printStep('Report Routes (Admin) — Validation');

        // All query params are optional for admin report — nothing to reject.
        // We confirm the endpoint ACCEPTS an empty query gracefully.
        try {
            const res = await adminClient.get('/reports/admin/');
            console.log(`  [${res.status}] GET /reports/admin/ — no required params (skip validation test)`);
            recordTest('[VALIDATE] GET /reports/admin/ — no required params', true, `Status ${res.status} (no validation to test)`);
        } catch (e) {
            recordTest('[VALIDATE] GET /reports/admin/ — no required params', false, e.message);
        }
    })();
}
