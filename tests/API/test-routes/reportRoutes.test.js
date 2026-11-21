/**
 * Report Routes Tests
 * Tests: GET /admin/reports, GET /assignee/reports
 */

// Admin Reports (run under perm=4)
export async function reportAdminTest({ adminClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('Report Routes (Admin)');

    // --- GET /admin/reports ---
    try {
        const res = await adminClient.get('/admin/reports');
        assertTrue(res.status === 200, `Expected 200 from GET /admin/reports, got ${res.status}`);
        assertTrue(res.data?.range !== undefined, 'Expected range in admin report response');
        console.log(`  [${res.status}] GET /admin/reports — range: ${JSON.stringify(res.data.range)}`);
        recordTest('GET /admin/reports', true, `Range: ${JSON.stringify(res.data.range)}`);
    } catch (e) {
        recordTest('GET /admin/reports', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /admin/reports (with date range) ---
    try {
        const res = await adminClient.get('/admin/reports?startDate=2024-01-01&endDate=2030-12-31');
        assertTrue(res.status === 200, `Expected 200 from GET /admin/reports with dates, got ${res.status}`);
        console.log(`  [${res.status}] GET /admin/reports (with dates) — OK`);
        recordTest('GET /admin/reports (date range)', true, 'Accepted date range query');
    } catch (e) {
        recordTest('GET /admin/reports (date range)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }
}

// Assignee Reports (run under perm=2)
export async function reportAssigneeTest({ adminClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('Report Routes (Assignee)');

    const adminEmail = getShared('adminEmail');

    // --- GET /assignee/reports ---
    if (adminEmail) {
        try {
            const res = await adminClient.get(`/assignee/reports?email=${encodeURIComponent(adminEmail)}`);
            assertTrue(res.status === 200, `Expected 200 from GET /assignee/reports, got ${res.status}`);
            assertTrue(res.data?.range !== undefined, 'Expected range in assignee report response');
            console.log(`  [${res.status}] GET /assignee/reports — range: ${JSON.stringify(res.data.range)}`);
            recordTest('GET /assignee/reports', true, `Range: ${JSON.stringify(res.data.range)}`);
        } catch (e) {
            recordTest('GET /assignee/reports', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }

        // --- GET /assignee/reports (with days param) ---
        try {
            const res = await adminClient.get(`/assignee/reports?email=${encodeURIComponent(adminEmail)}&days=7`);
            assertTrue(res.status === 200, `Expected 200 from GET /assignee/reports with days, got ${res.status}`);
            console.log(`  [${res.status}] GET /assignee/reports (days=7) — OK`);
            recordTest('GET /assignee/reports (days=7)', true, 'Accepted days query param');
        } catch (e) {
            recordTest('GET /assignee/reports (days=7)', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }
    } else {
        console.log('  SKIP: No email for assignee report test');
        recordTest('GET /assignee/reports', false, 'Skipped — no email');
    }
}

// Default export for backward compat (runs both — use named exports for role-split)
export default async function reportRoutesTest(clients, helpers) {
    await reportAdminTest(clients, helpers);
    await reportAssigneeTest(clients, helpers);
}
