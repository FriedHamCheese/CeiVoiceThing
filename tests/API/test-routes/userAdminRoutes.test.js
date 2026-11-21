/**
 * User Admin Routes Tests (mounted at /admin/users)
 * Tests: GET /admin/users, POST /admin/users/setUserRole,
 *        GET /admin/users/getScopeTags, POST /admin/users/setScopeTags
 */
export default async function userAdminRoutesTest({ adminClient }, { recordTest, assertTrue, printStep, getShared }) {
    printStep('User Admin Routes (/admin/users)');

    const adminEmail = getShared('adminEmail');

    // --- GET /admin/users (list all users) ---
    let testUserEmail = null;
    try {
        const res = await adminClient.get('/admin/users');
        assertTrue(res.status === 200, `Expected 200 from GET /admin/users, got ${res.status}`);
        assertTrue(Array.isArray(res.data), 'Expected array of users');
        console.log(`  [${res.status}] GET /admin/users — ${res.data.length} users`);
        recordTest('GET /admin/users', true, `${res.data.length} users`);

        // Pick a non-admin user for role tests (avoid mutating the admin)
        const nonAdmin = res.data.find(u => u.perm === 1);
        if (nonAdmin) testUserEmail = nonAdmin.email;
    } catch (e) {
        recordTest('GET /admin/users', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- POST /admin/users/setUserRole ---
    if (testUserEmail) {
        try {
            // Promote to specialist (perm=2)
            const res = await adminClient.post('/admin/users/setUserRole', {
                userEmail: testUserEmail,
                perm: 2
            });
            assertTrue(res.status === 200, `Expected 200 from POST /admin/users/setUserRole, got ${res.status}`);
            console.log(`  [${res.status}] POST /admin/users/setUserRole — ${testUserEmail} → perm 2`);
            recordTest('POST /admin/users/setUserRole', true, `${testUserEmail} promoted to specialist`);
        } catch (e) {
            recordTest('POST /admin/users/setUserRole', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }

        // --- POST /admin/users/setScopeTags ---
        try {
            const res = await adminClient.post('/admin/users/setScopeTags', {
                email: testUserEmail,
                scopeTags: ['Hardware', 'Network']
            });
            assertTrue(res.status === 200, `Expected 200 from POST /admin/users/setScopeTags, got ${res.status}`);
            console.log(`  [${res.status}] POST /admin/users/setScopeTags — set [Hardware, Network]`);
            recordTest('POST /admin/users/setScopeTags', true, 'Scope tags set');
        } catch (e) {
            recordTest('POST /admin/users/setScopeTags', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }

        // --- GET /admin/users/getScopeTags ---
        try {
            const res = await adminClient.get('/admin/users/getScopeTags', {
                headers: { email: testUserEmail }
            });
            assertTrue(res.status === 200, `Expected 200 from GET /admin/users/getScopeTags, got ${res.status}`);
            assertTrue(Array.isArray(res.data), 'Expected array of scope tags');
            console.log(`  [${res.status}] GET /admin/users/getScopeTags — ${res.data.length} tags: [${res.data.join(', ')}]`);
            recordTest('GET /admin/users/getScopeTags', true, `Tags: [${res.data.join(', ')}]`);
        } catch (e) {
            recordTest('GET /admin/users/getScopeTags', false, e.message);
            console.error(`  FAIL: ${e.message}`);
        }

        // --- Demote back to user (perm=1) to clean up ---
        try {
            await adminClient.post('/admin/users/setUserRole', {
                userEmail: testUserEmail,
                perm: 1
            });
            console.log(`  [cleanup] Demoted ${testUserEmail} back to perm 1`);
        } catch (e) {
            console.error(`  [cleanup] Failed to demote ${testUserEmail}: ${e.message}`);
        }
    } else {
        console.log('  SKIP: No non-admin user found for setUserRole/getScopeTags/setScopeTags tests');
        recordTest('POST /admin/users/setUserRole', false, 'Skipped — no test user');
        recordTest('POST /admin/users/setScopeTags', false, 'Skipped — no test user');
        recordTest('GET /admin/users/getScopeTags', false, 'Skipped — no test user');
    }
}
