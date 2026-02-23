/**
 * Admin Router Routes Tests (mounted at /admin)
 * Tests: GET /admin/users, PATCH /admin/users/:email/role
 */
export default async function adminRoutesTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Admin Router Routes (/admin)');

    // --- GET /admin/users (list users via adminRouter.admin.js) ---
    let testUserEmail = null;
    try {
        const res = await adminClient.get('/admin/users');
        assertTrue(res.status === 200, `Expected 200 from GET /admin/users, got ${res.status}`);
        assertTrue(res.data?.success === true || Array.isArray(res.data) || res.data?.users !== undefined,
            'Expected success or users data from /admin/users');
        const users = res.data?.users || res.data;
        console.log(`  [${res.status}] GET /admin/users — ${Array.isArray(users) ? users.length : '?'} users`);
        recordTest('GET /admin/users (adminRouter)', true, 'Users listed');

        // Find a non-admin user for the patch test
        if (Array.isArray(users)) {
            const nonAdmin = users.find(u => u.perm === 1);
            if (nonAdmin) testUserEmail = nonAdmin.email;
        }
    } catch (e) {
        recordTest('GET /admin/users (adminRouter)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- PATCH /admin/users/:email/role ---
    if (testUserEmail) {
        try {
            // Temporarily set to perm 2
            const res = await adminClient.patch(`/admin/users/${encodeURIComponent(testUserEmail)}/role`, {
                perm: 2
            });
            assertTrue(res.status === 200, `Expected 200 from PATCH /admin/users/:email/role, got ${res.status}`);
            console.log(`  [${res.status}] PATCH /admin/users/${testUserEmail}/role — set to perm 2`);
            recordTest('PATCH /admin/users/:email/role', true, `${testUserEmail} → perm 2`);

            // Revert
            await adminClient.patch(`/admin/users/${encodeURIComponent(testUserEmail)}/role`, { perm: 1 });
            console.log(`  [cleanup] Reverted ${testUserEmail} to perm 1`);
        } catch (e) {
            recordTest('PATCH /admin/users/:email/role', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }
    } else {
        console.log('  SKIP: No non-admin user found for PATCH role test');
        recordTest('PATCH /admin/users/:email/role', false, 'Skipped — no test user');
    }
}
