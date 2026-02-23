import axios from 'axios';

const config = {
	apiUrl: process.env.UAT_API_URL || '',
	sessionCookie: process.env.UAT_SESSION_COOKIE || process.env.UAT_USER_SESSION_COOKIE || '',
	userEmail: process.env.UAT_USER_EMAIL || '',
	userPassword: process.env.UAT_USER_PASSWORD || '',
	requestText: process.env.UAT_REQUEST_TEXT || 'I cannot access my classroom portal.',
	expectedFinalStatus: process.env.UAT_EXPECT_STATUS || '',
	expectAuthenticatedSession: process.env.UAT_EXPECT_AUTH_SESSION === 'false',
	skipCaptcha: process.env.UAT_SKIP_CAPTCHA !== 'TRUE',
};

const http = axios.create({
	baseURL: undefined,
	timeout: 15000,
	validateStatus: () => true,
	maxRedirects: 0,
	withCredentials: true
});

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

let sessionCookie = config.sessionCookie;

function getAuthHeaders() {
	if (!sessionCookie) {
		return {};
	}
	return { Cookie: sessionCookie };
}

function printStep(title) {
	console.log(`\n=== ${title} ===`);
}

async function performLogin(apiUrl) {
	if (sessionCookie) {
		console.log('INFO: Using provided session cookie (skipping login).');
		return;
	}

	if (!config.userEmail || !config.userPassword) {
		fail('Cannot auto-login: UAT_USER_EMAIL and UAT_USER_PASSWORD are required when session cookie is not provided.');
	}

	printStep('Auto-Login');

	const loginPayload = {
		email: config.userEmail,
		password: config.userPassword
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
		fail(`Login failed: ${response.status} ${response.data?.message || 'Unknown error'}`);
	}

	const setCookieHeader = response.headers['set-cookie'];
	if (!setCookieHeader || setCookieHeader.length === 0) {
		fail('Login succeeded but no session cookie returned.');
	}

	sessionCookie = setCookieHeader
		.map(c => c.split(';')[0])
		.join('; ');

	console.log(`PASS: Logged in as ${config.userEmail}.`);
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

async function runUatSub001() {
	printStep('UAT-SUB-001: Basic Request Submission');

	assertTrue(config.userEmail, 'Missing UAT_USER_EMAIL');

	const body = {
		fromEmail: config.userEmail,
		requestText: config.requestText
	};

	const response = await http.post('/tickets/request', body, {
		headers: {
			'Content-Type': 'application/json',
			...getAuthHeaders()
		}
	});

	assertTrue(response.status === 200, `Expected 200 from POST /tickets/request, got ${response.status}`);
	assertTrue(response.data && typeof response.data.trackingToken === 'string', 'trackingToken was not returned');
	assertTrue(response.data.message === 'Draft ticket created successfully.', 'Unexpected submission message');

	console.log('PASS: Submission accepted and tracking token returned.');
	return response.data.trackingToken;
}

async function runUatSub002() {
	printStep('UAT-SUB-002: Google Account Registration/Login');

	const oauthEntry = await http.get('/auth/google');
	const redirectLocation = oauthEntry.headers.location || '';

	assertTrue(
		oauthEntry.status === 302 || oauthEntry.status === 301,
		`Expected OAuth redirect (301/302), got ${oauthEntry.status}`
	);
	assertTrue(
		redirectLocation.includes('accounts.google.com'),
		`Expected redirect to Google OAuth, got: ${redirectLocation || 'no location header'}`
	);

	console.log('PASS: Google OAuth entrypoint redirect is correct.');

	if (config.expectAuthenticatedSession) {
		assertTrue(sessionCookie, 'Missing session for auth session check');
		assertTrue(config.userEmail, 'Missing UAT_USER_EMAIL for auth session check');

		const sessionResponse = await http.get('/auth/session', {
			headers: getAuthHeaders()
		});

		assertTrue(sessionResponse.status === 200, `Expected 200 from /auth/session, got ${sessionResponse.status}`);
		assertTrue(sessionResponse.data?.success === true, 'Expected success=true from /auth/session');
		assertTrue(sessionResponse.data?.user?.email === config.userEmail, 'Authenticated session email mismatch');

		const trackingViewResponse = await http.get(`/tickets/${encodeURIComponent(config.userEmail)}/requests`, {
			headers: getAuthHeaders()
		});

		assertTrue(
			trackingViewResponse.status === 200,
			`Expected 200 from user tracking view, got ${trackingViewResponse.status}`
		);
		assertTrue(Array.isArray(trackingViewResponse.data), 'Expected tracking view payload to be an array');

		console.log('PASS: Authenticated session can access user ticket tracking view.');
	} else {
		console.log('INFO: Skipped authenticated-session assertion. Set UAT_EXPECT_AUTH_SESSION=true to enable it.');
	}
}

async function runUatSub003(trackingToken) {
	printStep('UAT-SUB-003: Ticket Status Visibility');

	assertTrue(typeof trackingToken === 'string' && trackingToken.length > 0, 'Missing tracking token for UAT-SUB-003');
	assertTrue(config.userEmail, 'Missing UAT_USER_EMAIL');

	const response = await http.get(`/public/tickets/track/${encodeURIComponent(trackingToken)}?email=${encodeURIComponent(config.userEmail)}`);

	assertTrue(response.status === 200, `Expected 200 from track endpoint, got ${response.status}`);
	assertTrue(typeof response.data?.status === 'string', 'Track response did not contain status');

	const status = response.data.status;
	const allowedStatuses = new Set(['Pending', 'Draft', 'New', 'Assigned', 'Solving', 'Solved', 'Failed', 'Renew']);
	assertTrue(allowedStatuses.has(status), `Unexpected status value: ${status}`);

	if (config.expectedFinalStatus) {
		assertTrue(
			status.toLowerCase() === config.expectedFinalStatus.toLowerCase(),
			`Expected status ${config.expectedFinalStatus}, got ${status}`
		);

		if (config.expectedFinalStatus.toLowerCase() === 'solved') {
			assertTrue(Array.isArray(response.data.comments), 'Expected public comments array for solved ticket');
		}
	}

	console.log(`PASS: Tracking page is accessible and shows status=${status}.`);
	if (!config.expectedFinalStatus) {
		console.log('INFO: For full UAT-SUB-003 (Solved visibility), set UAT_EXPECT_STATUS=Solved after assignee/admin updates the ticket.');
	}
}

async function main() {
	let resolvedApiUrl;
	let trackingToken;
	
	try {
		resolvedApiUrl = await resolveApiBaseUrl();
		http.defaults.baseURL = resolvedApiUrl;
		console.log('Running CEiVoice UAT-SUB automated checks...');
		console.log(`API URL: ${resolvedApiUrl}`);
	} catch (error) {
		console.error('\nFATAL: Cannot reach backend API.');
		console.error(error.message || error);
		process.exit(1);
	}

	try {
		await performLogin(resolvedApiUrl);
	} catch (error) {
		console.error('\nFATAL: Login failed.');
		console.error(error.message || error);
		process.exit(1);
	}

	// UAT-SUB-001
	try {
		trackingToken = await runUatSub001();
		recordTest('UAT-SUB-001', true, 'Basic Request Submission');
	} catch (error) {
		recordTest('UAT-SUB-001', false, error.message || error);
		console.error(`FAIL: ${error.message || error}`);
	}

	// UAT-SUB-002
	try {
		await runUatSub002();
		recordTest('UAT-SUB-002', true, 'Google Account Registration/Login');
	} catch (error) {
		recordTest('UAT-SUB-002', false, error.message || error);
		console.error(`FAIL: ${error.message || error}`);
	}

	// UAT-SUB-003
	if (trackingToken) {
		try {
			await runUatSub003(trackingToken);
			recordTest('UAT-SUB-003', true, 'Public Ticket Tracking');
		} catch (error) {
			recordTest('UAT-SUB-003', false, error.message || error);
			console.error(`FAIL: ${error.message || error}`);
		}
	} else {
		recordTest('UAT-SUB-003', false, 'Skipped (no tracking token from SUB-001)');
		console.log('SKIP: UAT-SUB-003 (no tracking token available)');
	}

	// Summary
	console.log('\n' + '='.repeat(60));
	console.log('UAT-SUB Test Summary');
	console.log('='.repeat(60));
	
	const passed = testResults.filter(t => t.passed).length;
	const failed = testResults.filter(t => !t.passed).length;
	
	testResults.forEach(result => {
		const status = result.passed ? '✓ PASS' : '✗ FAIL';
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
