/**
 * Auth Routes — Data Validation Tests
 * Validates: POST /auth/login, POST /auth/register
 */
export default async function authValidationTest({ adminClient }, { recordTest, assertTrue, printStep }) {
    printStep('Auth Routes — Validation');

    const endpoint = (label) => `[VALIDATE] ${label}`;

    // ========================================================================
    // POST /auth/login
    // Schema: { body: { email, password(min8), captchaToken(min1) } }
    // ========================================================================

    // Missing body entirely
    try {
        const res = await adminClient.post('/auth/login', {});
        assertTrue(res.status === 400, `Expected 400 for empty body, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/login — empty body`);
        recordTest(endpoint('POST /auth/login — empty body'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/login — empty body'), false, e.message);
    }

    // Invalid email
    try {
        const res = await adminClient.post('/auth/login', {
            email: 'not-an-email',
            password: 'validpass123',
            captchaToken: 'token123'
        });
        assertTrue(res.status === 400, `Expected 400 for invalid email, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/login — invalid email`);
        recordTest(endpoint('POST /auth/login — invalid email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/login — invalid email'), false, e.message);
    }

    // Short password (< 8 chars)
    try {
        const res = await adminClient.post('/auth/login', {
            email: 'test@example.com',
            password: 'short',
            captchaToken: 'token123'
        });
        assertTrue(res.status === 400, `Expected 400 for short password, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/login — short password`);
        recordTest(endpoint('POST /auth/login — short password'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/login — short password'), false, e.message);
    }

    // Missing captchaToken
    try {
        const res = await adminClient.post('/auth/login', {
            email: 'test@example.com',
            password: 'validpass123'
        });
        assertTrue(res.status === 400, `Expected 400 for missing captchaToken, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/login — missing captchaToken`);
        recordTest(endpoint('POST /auth/login — missing captchaToken'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/login — missing captchaToken'), false, e.message);
    }

    // Empty captchaToken
    try {
        const res = await adminClient.post('/auth/login', {
            email: 'test@example.com',
            password: 'validpass123',
            captchaToken: ''
        });
        assertTrue(res.status === 400, `Expected 400 for empty captchaToken, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/login — empty captchaToken`);
        recordTest(endpoint('POST /auth/login — empty captchaToken'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/login — empty captchaToken'), false, e.message);
    }

    // ========================================================================
    // POST /auth/register
    // Schema: { body: { email, password(min8), captchaToken(min1) } }
    // ========================================================================

    // Missing body entirely
    try {
        const res = await adminClient.post('/auth/register', {});
        assertTrue(res.status === 400, `Expected 400 for empty body, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/register — empty body`);
        recordTest(endpoint('POST /auth/register — empty body'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/register — empty body'), false, e.message);
    }

    // Invalid email
    try {
        const res = await adminClient.post('/auth/register', {
            email: 'bad-email',
            password: 'validpass123',
            captchaToken: 'token123'
        });
        assertTrue(res.status === 400, `Expected 400 for invalid email, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/register — invalid email`);
        recordTest(endpoint('POST /auth/register — invalid email'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/register — invalid email'), false, e.message);
    }

    // Short password
    try {
        const res = await adminClient.post('/auth/register', {
            email: 'test@example.com',
            password: 'abc',
            captchaToken: 'token123'
        });
        assertTrue(res.status === 400, `Expected 400 for short password, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/register — short password`);
        recordTest(endpoint('POST /auth/register — short password'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/register — short password'), false, e.message);
    }

    // Missing captchaToken
    try {
        const res = await adminClient.post('/auth/register', {
            email: 'test@example.com',
            password: 'validpass123'
        });
        assertTrue(res.status === 400, `Expected 400 for missing captchaToken, got ${res.status}`);
        console.log(`  [${res.status}] POST /auth/register — missing captchaToken`);
        recordTest(endpoint('POST /auth/register — missing captchaToken'), true, 'Rejected');
    } catch (e) {
        recordTest(endpoint('POST /auth/register — missing captchaToken'), false, e.message);
    }
}
