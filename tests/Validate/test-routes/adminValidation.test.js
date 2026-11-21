/**
 * Admin Routes — Data Validation Tests
 * Validates: PATCH /admin/users/:email/role
 */
export default async function adminValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Admin Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // PATCH /admin/users/:email/role
    // Schema: { params: { email: email() }, body: { perm: number() } }
    // ========================================================================

    // Invalid email in param
    try {
        const res = await adminClient.patch('/admin/users/not-an-email/role', { perm: 1 });
        assertTrue(res.status === 400, `Expected 400 for invalid email param, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/users/:email/role — invalid email param`);
        recordTest(endpoint('PATCH users/:email/role — invalid email param'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH users/:email/role — invalid email param'), false, e.message);
    }

    // Missing perm in body
    try {
        const res = await adminClient.patch('/admin/users/test@example.com/role', {});
        assertTrue(res.status === 400, `Expected 400 for missing perm, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/users/:email/role — missing perm`);
        recordTest(endpoint('PATCH users/:email/role — missing perm'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH users/:email/role — missing perm'), false, e.message);
    }

    // Non-number perm
    try {
        const res = await adminClient.patch('/admin/users/test@example.com/role', { perm: 'admin' });
        assertTrue(res.status === 400, `Expected 400 for non-number perm, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/users/:email/role — non-number perm`);
        recordTest(endpoint('PATCH users/:email/role — non-number perm'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH users/:email/role — non-number perm'), false, e.message);
    }

    // Both invalid email and missing perm
    try {
        const res = await adminClient.patch('/admin/users/bad-email/role', {});
        assertTrue(res.status === 400, `Expected 400 for both invalid, got ${res.status}`);
        console.log(`  [${res.status}] PATCH /admin/users/:email/role — both invalid`);
        recordTest(endpoint('PATCH users/:email/role — both invalid'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('PATCH users/:email/role — both invalid'), false, e.message);
    }
}
