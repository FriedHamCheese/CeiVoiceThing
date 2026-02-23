/**
 * Auth Routes Tests
 * Tests: /auth/session, /auth/google, /auth/role
 */
export default async function authRoutesTest({ adminClient, userClient }, { recordTest, assertTrue, printStep }) {
    printStep('Auth Routes');

    // --- GET /auth/session (Authenticated) ---
    try {
        const res = await adminClient.get('/auth/session');
        assertTrue(res.status === 200, `Expected 200 from GET /auth/session, got ${res.status}`);
        assertTrue(res.data?.success === true, 'Expected success=true from /auth/session');
        assertTrue(typeof res.data?.user?.email === 'string', 'Expected user.email in session response');
        console.log(`  [${res.status}] GET /auth/session — user: ${res.data.user.email}`);
        recordTest('GET /auth/session', true, `Authenticated as ${res.data.user.email}`);
    } catch (e) {
        recordTest('GET /auth/session', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /auth/session (Unauthenticated — no cookie) ---
    try {
        const { default: axios } = await import('axios');
        const noAuthClient = axios.create({
            baseURL: adminClient.defaults.baseURL,
            validateStatus: () => true
        });
        const res = await noAuthClient.get('/auth/session');
        assertTrue(res.status === 401, `Expected 401 from unauthenticated GET /auth/session, got ${res.status}`);
        console.log(`  [${res.status}] GET /auth/session (no cookie) — correctly unauthorized`);
        recordTest('GET /auth/session (unauth)', true, 'Returns 401 without session');
    } catch (e) {
        recordTest('GET /auth/session (unauth)', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }

    // --- GET /auth/google (OAuth redirect) ---
    try {
        const { default: axios } = await import('axios');
        const noRedirectClient = axios.create({
            baseURL: adminClient.defaults.baseURL,
            validateStatus: () => true,
            maxRedirects: 0
        });
        const res = await noRedirectClient.get('/auth/google');
        const location = res.headers.location || '';
        assertTrue(
            res.status === 301 || res.status === 302,
            `Expected 301/302 redirect from /auth/google, got ${res.status}`
        );
        assertTrue(location.includes('accounts.google.com'), 'Expected redirect to accounts.google.com');
        console.log(`  [${res.status}] GET /auth/google — redirects to Google OAuth`);
        recordTest('GET /auth/google', true, 'Redirects to Google OAuth');
    } catch (e) {
        recordTest('GET /auth/google', false, e.message);
        console.error(`  FAIL: ${e.message}`);
    }
}
