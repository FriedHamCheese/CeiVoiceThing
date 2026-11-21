import axios from 'axios';

const config = {
    apiUrl: process.env.UAT_API_URL || '',
    userEmail: process.env.UAT_USER_EMAIL || '',
    userPassword: process.env.UAT_USER_PASSWORD || '',
    userSessionCookie: process.env.UAT_USER_SESSION_COOKIE || '',
    adminEmail: process.env.UAT_ADMIN_EMAIL || '',
    adminPassword: process.env.UAT_ADMIN_PASSWORD || '',
    adminSessionCookie: process.env.UAT_ADMIN_SESSION_COOKIE || '',
    requestText: process.env.UAT_REQUEST_TEXT || 'I cannot access my classroom portal.',
    solvedComment: process.env.UAT_SOLVED_COMMENT || 'Issue confirmed fixed. Final resolution shared with user.',
    pollMs: Number(process.env.UAT_POLL_MS || 1000),
    maxPollAttempts: Number(process.env.UAT_MAX_POLL_ATTEMPTS || 15),
    skipCaptcha: process.env.UAT_SKIP_CAPTCHA !== 'false'
};

const http = axios.create({
    baseURL: undefined,
    timeout: 20000,
    validateStatus: () => true,
    maxRedirects: 0,
    withCredentials: true
});

let userSessionCookie = config.userSessionCookie;
let adminSessionCookie = config.adminSessionCookie;

const testResults = [];

function recordTest(name, passed, message = '') {
    testResults.push({ name, passed, message });
}

function fail(message) {
    throw new Error(message);
}

function assertTrue(condition, message) {
    if (!condition) fail(message);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function headersWithCookie(cookieValue) {
    return cookieValue ? { Cookie: cookieValue } : {};
}

function printStep(title) {
    console.log(`\n=== ${title} ===`);
}

async function performLogin(apiUrl, email, password, roleName) {
    printStep(`Auto-Login: ${roleName}`);

    const loginPayload = {
        email,
        password
    };

    if (!config.skipCaptcha) {
        loginPayload.captchaToken = process.env.UAT_CAPTCHA_TOKEN || '';
        if (!loginPayload.captchaToken) {
            fail('Captcha is enabled but UAT_CAPTCHA_TOKEN not provided. Set UAT_SKIP_CAPTCHA=false or provide token.');
        }
    }

    const response = await http.post(`${apiUrl}/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.status !== 200 || !response.data?.success) {
        fail(`${roleName} login failed: ${response.status} ${response.data?.message || 'Unknown error'}`);
    }

    const setCookieHeader = response.headers['set-cookie'];
    if (!setCookieHeader || setCookieHeader.length === 0) {
        fail(`${roleName} login succeeded but no session cookie returned.`);
    }

    const cookie = setCookieHeader
        .map(c => c.split(';')[0])
        .join('; ');

    console.log(`PASS: ${roleName} logged in as ${email}.`);
    return cookie;
}

async function resolveApiBaseUrl() {
    const candidates = [];
    if (config.apiUrl) {
        candidates.push(config.apiUrl);
    }
    candidates.push('http://localhost:5001', 'http://localhost:3000');

    const uniqueCandidates = [...new Set(candidates)];

    for (const candidate of uniqueCandidates) {
        try {
            const response = await axios.get(`${candidate}/auth/session`, {
                timeout: 4000,
                validateStatus: () => true,
                maxRedirects: 0
            });

            if (response.status === 200 || response.status === 401) {
                return candidate;
            }
        } catch {
            // try next candidate
        }
    }

    fail(`Cannot reach backend API. Tried: ${uniqueCandidates.join(', ')}.`);
}

async function submitUserRequest() {
    printStep('UAT-SUB-001 Arrange/Act/Assert: Submit Request');

    assertTrue(config.userEmail, 'Missing UAT_USER_EMAIL');
    assertTrue(userSessionCookie, 'Missing user session (login failed or not provided)');

    const response = await http.post(
        '/tickets/request',
        {
            fromEmail: config.userEmail,
            requestText: config.requestText
        },
        {
            headers: {
                'Content-Type': 'application/json',
                ...headersWithCookie(userSessionCookie)
            }
        }
    );

    assertTrue(response.status === 200, `Expected 200 from POST /tickets/request, got ${response.status}`);
    assertTrue(typeof response.data?.trackingToken === 'string' && response.data.trackingToken.length > 0, 'Missing tracking token from submission');

    console.log(`PASS: Request submitted with tracking token ${response.data.trackingToken}`);
    return response.data.trackingToken;
}

async function assertGoogleAuthEntrypoint() {
    printStep('UAT-SUB-002 Arrange/Act/Assert: Google Login Entrypoint');

    const oauthResponse = await http.get('/auth/google');
    const location = oauthResponse.headers.location || '';

    assertTrue(
        oauthResponse.status === 301 || oauthResponse.status === 302,
        `Expected OAuth redirect (301/302), got ${oauthResponse.status}`
    );
    assertTrue(location.includes('accounts.google.com'), 'OAuth redirect does not point to Google');

    const sessionCheck = await http.get('/auth/session', {
        headers: headersWithCookie(userSessionCookie)
    });

    assertTrue(sessionCheck.status === 200, `Expected authenticated session status 200, got ${sessionCheck.status}`);
    assertTrue(sessionCheck.data?.user?.email === config.userEmail, 'User session email mismatch');

    console.log('PASS: Google OAuth entrypoint and authenticated user session checks passed.');
}

async function findTicketIdByTrackingToken(trackingToken) {
    assertTrue(adminSessionCookie, 'Missing admin session (login failed or not provided)');

    for (let attempt = 1; attempt <= config.maxPollAttempts; attempt += 1) {
        const allTicketsResponse = await http.get('/admin/tickets', {
            headers: headersWithCookie(adminSessionCookie)
        });

        assertTrue(allTicketsResponse.status === 200, `Expected 200 from GET /admin/tickets, got ${allTicketsResponse.status}`);
        const tickets = allTicketsResponse.data?.tickets;
        assertTrue(Array.isArray(tickets), 'Expected tickets array from /admin/tickets');

        for (const ticket of tickets) {
            const requestsResponse = await http.get(`/admin/tickets/${ticket.id}/requests`, {
                headers: headersWithCookie(adminSessionCookie)
            });

            if (requestsResponse.status !== 200 || !Array.isArray(requestsResponse.data)) {
                continue;
            }

            const matched = requestsResponse.data.some(requestRow => requestRow.tracking_token === trackingToken);
            if (matched) {
                console.log(`PASS: Located ticket id=${ticket.id} for tracking token.`);
                return ticket.id;
            }
        }

        if (attempt < config.maxPollAttempts) {
            console.log(`INFO: Ticket not found yet (attempt ${attempt}/${config.maxPollAttempts}), retrying...`);
            await sleep(config.pollMs);
        }
    }

    fail('Could not locate ticket by tracking token via admin endpoints.');
}

async function promoteAndSolveTicket(ticketId) {
    printStep('Promote Draft -> New -> Solved');

    const promoteResponse = await http.patch(
        `/admin/tickets/${ticketId}`,
        { status: 'New' },
        {
            headers: {
                'Content-Type': 'application/json',
                ...headersWithCookie(adminSessionCookie)
            }
        }
    );

    assertTrue(promoteResponse.status === 200, `Expected 200 promoting ticket to New, got ${promoteResponse.status}`);

    const solveResponse = await http.patch(
        `/admin/tickets/${ticketId}`,
        {
            status: 'Solved',
            resolutionComment: config.solvedComment
        },
        {
            headers: {
                'Content-Type': 'application/json',
                ...headersWithCookie(adminSessionCookie)
            }
        }
    );

    assertTrue(solveResponse.status === 200, `Expected 200 solving ticket, got ${solveResponse.status}`);

    console.log('PASS: Admin promoted and solved ticket successfully.');
}

async function assertPublicTrackingSolved(trackingToken) {
    printStep('UAT-SUB-003 Arrange/Act/Assert: Public Tracking Shows Solved');

    const trackResponse = await http.get(
        `/public/tickets/track/${encodeURIComponent(trackingToken)}?email=${encodeURIComponent(config.userEmail)}`
    );

    assertTrue(trackResponse.status === 200, `Expected 200 from public tracking endpoint, got ${trackResponse.status}`);
    assertTrue(trackResponse.data?.status === 'Solved', `Expected status=Solved, got ${trackResponse.data?.status}`);
    assertTrue(typeof trackResponse.data?.resolutionComment === 'string', 'Expected resolutionComment in tracking payload');

    console.log('PASS: Public tracking shows Solved status and resolution comment.');
}

async function main() {
    console.log('Running CEiVoice end-to-end UAT-SUB-001..003 solve flow...');
    
    let resolvedApiUrl;
    let trackingToken;
    let ticketId;

    // Resolve API URL
    try {
        resolvedApiUrl = await resolveApiBaseUrl();
        http.defaults.baseURL = resolvedApiUrl;
        console.log(`API URL: ${resolvedApiUrl}`);
    } catch (error) {
        console.error('\nFATAL: Cannot reach backend API.');
        console.error(error.message || error);
        process.exit(1);
    }

    // User Login
    try {
        if (!userSessionCookie) {
            if (!config.userEmail || !config.userPassword) {
                fail('Missing UAT_USER_EMAIL and UAT_USER_PASSWORD (required for auto-login when session cookie not provided).');
            }
            userSessionCookie = await performLogin(resolvedApiUrl, config.userEmail, config.userPassword, 'User');
        } else {
            console.log('INFO: Using provided user session cookie (skipping user login).');
        }
    } catch (error) {
        console.error('\nFATAL: User login failed.');
        console.error(error.message || error);
        process.exit(1);
    }

    // Admin Login
    try {
        if (!adminSessionCookie) {
            if (!config.adminEmail || !config.adminPassword) {
                fail('Missing UAT_ADMIN_EMAIL and UAT_ADMIN_PASSWORD (required for auto-login when admin session cookie not provided).');
            }
            adminSessionCookie = await performLogin(resolvedApiUrl, config.adminEmail, config.adminPassword, 'Admin');
        } else {
            console.log('INFO: Using provided admin session cookie (skipping admin login).');
        }
    } catch (error) {
        console.error('\nFATAL: Admin login failed.');
        console.error(error.message || error);
        process.exit(1);
    }

    // Step 1: Submit User Request
    try {
        trackingToken = await submitUserRequest();
        recordTest('Submit Request', true, 'User request submitted successfully');
    } catch (error) {
        recordTest('Submit Request', false, error.message || error);
        console.error(`FAIL: ${error.message || error}`);
    }

    // Step 2: Google Auth Entrypoint
    try {
        await assertGoogleAuthEntrypoint();
        recordTest('Google OAuth', true, 'OAuth redirect verified');
    } catch (error) {
        recordTest('Google OAuth', false, error.message || error);
        console.error(`FAIL: ${error.message || error}`);
    }

    // Step 3: Find Ticket by Tracking Token
    if (trackingToken) {
        try {
            ticketId = await findTicketIdByTrackingToken(trackingToken);
            recordTest('Find Ticket', true, `Ticket ID ${ticketId} found`);
        } catch (error) {
            recordTest('Find Ticket', false, error.message || error);
            console.error(`FAIL: ${error.message || error}`);
        }
    } else {
        recordTest('Find Ticket', false, 'Skipped (no tracking token)');
        console.log('SKIP: Find Ticket (no tracking token from submit)');
    }

    // Step 4: Promote and Solve Ticket
    if (ticketId) {
        try {
            await promoteAndSolveTicket(ticketId);
            recordTest('Promote & Solve', true, 'Ticket promoted to New and solved');
        } catch (error) {
            recordTest('Promote & Solve', false, error.message || error);
            console.error(`FAIL: ${error.message || error}`);
        }
    } else {
        recordTest('Promote & Solve', false, 'Skipped (no ticket ID)');
        console.log('SKIP: Promote & Solve (no ticket ID)');
    }

    // Step 5: Assert Public Tracking Shows Solved
    if (trackingToken) {
        try {
            await assertPublicTrackingSolved(trackingToken);
            recordTest('Public Tracking', true, 'Public tracking shows Solved status');
        } catch (error) {
            recordTest('Public Tracking', false, error.message || error);
            console.error(`FAIL: ${error.message || error}`);
        }
    } else {
        recordTest('Public Tracking', false, 'Skipped (no tracking token)');
        console.log('SKIP: Public Tracking (no tracking token)');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('E2E UAT-SUB Test Summary');
    console.log('='.repeat(60));
    
    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;
    
    testResults.forEach(result => {
        const status = result.passed ? '\u2713 PASS' : '\u2717 FAIL';
        console.log(`${status}: ${result.name} - ${result.message}`);
    });
    
    console.log('='.repeat(60));
    console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('='.repeat(60));
    
    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('\nUnexpected error during UAT execution.');
    console.error(error.message || error);
    process.exit(1);
});