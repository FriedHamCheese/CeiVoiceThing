/**
 * User Admin Routes — Data Validation Tests
 * Validates: POST /admin/users/setUserRole, GET /admin/users/getScopeTags,
 *            POST /admin/users/setScopeTags
 */
export default async function userAdminValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('User Admin Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // POST /admin/users/setUserRole
    // Schema: { body: { userEmail: email(), perm: int() } }
    // ========================================================================

    // Empty body
    try {
        const res = await adminClient.post('/admin/users/setUserRole', {});
        assertTrue(res.status === 400, `Expected 400 for empty body, got ${res.status}`);
        console.log(`  [${res.status}] POST setUserRole — empty body`);
        recordTest(endpoint('POST setUserRole — empty body'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setUserRole — empty body'), false, e.message);
    }

    // Missing userEmail
    try {
        const res = await adminClient.post('/admin/users/setUserRole', { perm: 1 });
        assertTrue(res.status === 400, `Expected 400 for missing userEmail, got ${res.status}`);
        console.log(`  [${res.status}] POST setUserRole — missing userEmail`);
        recordTest(endpoint('POST setUserRole — missing userEmail'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setUserRole — missing userEmail'), false, e.message);
    }

    // Invalid userEmail
    try {
        const res = await adminClient.post('/admin/users/setUserRole', {
            userEmail: 'not-email',
            perm: 1
        });
        assertTrue(res.status === 400, `Expected 400 for invalid userEmail, got ${res.status}`);
        console.log(`  [${res.status}] POST setUserRole — invalid userEmail`);
        recordTest(endpoint('POST setUserRole — invalid userEmail'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setUserRole — invalid userEmail'), false, e.message);
    }

    // Missing perm
    try {
        const res = await adminClient.post('/admin/users/setUserRole', {
            userEmail: 'user@example.com'
        });
        assertTrue(res.status === 400, `Expected 400 for missing perm, got ${res.status}`);
        console.log(`  [${res.status}] POST setUserRole — missing perm`);
        recordTest(endpoint('POST setUserRole — missing perm'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setUserRole — missing perm'), false, e.message);
    }

    // Non-integer perm (string)
    try {
        const res = await adminClient.post('/admin/users/setUserRole', {
            userEmail: 'user@example.com',
            perm: 'admin'
        });
        assertTrue(res.status === 400, `Expected 400 for non-integer perm, got ${res.status}`);
        console.log(`  [${res.status}] POST setUserRole — non-integer perm`);
        recordTest(endpoint('POST setUserRole — non-integer perm'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setUserRole — non-integer perm'), false, e.message);
    }

    // Float perm
    try {
        const res = await adminClient.post('/admin/users/setUserRole', {
            userEmail: 'user@example.com',
            perm: 1.5
        });
        assertTrue(res.status === 400, `Expected 400 for float perm, got ${res.status}`);
        console.log(`  [${res.status}] POST setUserRole — float perm`);
        recordTest(endpoint('POST setUserRole — float perm'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setUserRole — float perm'), false, e.message);
    }

    // ========================================================================
    // GET /admin/users/getScopeTags
    // Schema: { headers: looseObject({ email: email() }) }
    // ========================================================================

    // Missing email header
    try {
        const res = await adminClient.get('/admin/users/getScopeTags');
        assertTrue(res.status === 400, `Expected 400 for missing email header, got ${res.status}`);
        console.log(`  [${res.status}] GET getScopeTags — missing email header`);
        recordTest(endpoint('GET getScopeTags — missing email header'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET getScopeTags — missing email header'), false, e.message);
    }

    // Invalid email header
    try {
        const res = await adminClient.get('/admin/users/getScopeTags', {
            headers: { email: 'invalid-email' }
        });
        assertTrue(res.status === 400, `Expected 400 for invalid email header, got ${res.status}`);
        console.log(`  [${res.status}] GET getScopeTags — invalid email header`);
        recordTest(endpoint('GET getScopeTags — invalid email header'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('GET getScopeTags — invalid email header'), false, e.message);
    }

    // ========================================================================
    // POST /admin/users/setScopeTags
    // Schema: { body: { email: email(), scopeTags: str[](min1) } }
    // ========================================================================

    // Empty body
    try {
        const res = await adminClient.post('/admin/users/setScopeTags', {});
        assertTrue(res.status === 400, `Expected 400 for empty body, got ${res.status}`);
        console.log(`  [${res.status}] POST setScopeTags — empty body`);
        recordTest(endpoint('POST setScopeTags — empty body'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setScopeTags — empty body'), false, e.message);
    }

    // Missing email
    try {
        const res = await adminClient.post('/admin/users/setScopeTags', {
            scopeTags: ['tag1']
        });
        assertTrue(res.status === 400, `Expected 400 for missing email, got ${res.status}`);
        console.log(`  [${res.status}] POST setScopeTags — missing email`);
        recordTest(endpoint('POST setScopeTags — missing email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setScopeTags — missing email'), false, e.message);
    }

    // Invalid email
    try {
        const res = await adminClient.post('/admin/users/setScopeTags', {
            email: 'invalid',
            scopeTags: ['tag1']
        });
        assertTrue(res.status === 400, `Expected 400 for invalid email, got ${res.status}`);
        console.log(`  [${res.status}] POST setScopeTags — invalid email`);
        recordTest(endpoint('POST setScopeTags — invalid email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setScopeTags — invalid email'), false, e.message);
    }

    // Empty scopeTags array
    try {
        const res = await adminClient.post('/admin/users/setScopeTags', {
            email: 'user@example.com',
            scopeTags: []
        });
        assertTrue(res.status === 400, `Expected 400 for empty scopeTags, got ${res.status}`);
        console.log(`  [${res.status}] POST setScopeTags — empty scopeTags`);
        recordTest(endpoint('POST setScopeTags — empty scopeTags'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setScopeTags — empty scopeTags'), false, e.message);
    }

    // scopeTags not an array
    try {
        const res = await adminClient.post('/admin/users/setScopeTags', {
            email: 'user@example.com',
            scopeTags: 'single-tag'
        });
        assertTrue(res.status === 400, `Expected 400 for non-array scopeTags, got ${res.status}`);
        console.log(`  [${res.status}] POST setScopeTags — non-array scopeTags`);
        recordTest(endpoint('POST setScopeTags — non-array scopeTags'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST setScopeTags — non-array scopeTags'), false, e.message);
    }
}
