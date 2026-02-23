import { Builder, By, until } from 'selenium-webdriver';
import axios from 'axios';
import chrome from 'selenium-webdriver/chrome.js';

// Import all test modules
import authRoutesTest from './test-routes/authRoutes.test.js';
import ticketRoutesTest from './test-routes/ticketRoutes.test.js';
import ticketAdminRoutesTest from './test-routes/ticketAdminRoutes.test.js';
import ticketAssigneeRoutesTest from './test-routes/ticketAssigneeRoutes.test.js';
import ticketPublicRoutesTest from './test-routes/ticketPublicRoutes.test.js';
import ticketInternalRoutesTest from './test-routes/ticketInternalRoutes.test.js';
import { reportAdminTest, reportAssigneeTest } from './test-routes/reportRoutes.test.js';
import userAdminRoutesTest from './test-routes/userAdminRoutes.test.js';
import adminRoutesTest from './test-routes/adminRoutes.test.js';
import assigneeRoutesTest from './test-routes/assigneeRoutes.test.js';

// ============================================================================
// CONFIGURATION
// ============================================================================
const LOGIN_URL = 'http://localhost:5173/register';
const API_BASE_URL = 'http://localhost:5001';
const SUCCESS_URL = 'http://localhost:5173/';

// Role constants (must match backend ROLES)
const ROLE_USER = 1;
const ROLE_ASSIGNEE = 2;
const ROLE_ADMIN = 4;

// ============================================================================
// HELPERS
// ============================================================================
const testResults = [];
const sharedState = {};

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

function printStep(title) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${title}`);
    console.log('='.repeat(60));
}

function getShared(key) {
    return sharedState[key];
}

function setShared(key, value) {
    sharedState[key] = value;
}

// ============================================================================
// SELENIUM LOGIN FLOW (single login)
// ============================================================================
async function loginWithSelenium(driver) {
    console.log('\n🔐 Opening login page...');
    await driver.get(LOGIN_URL);

    console.log('🚨 ACTION REQUIRED: Please log in and solve CAPTCHA within 60 minutes...');
    await driver.wait(until.urlIs(SUCCESS_URL), 3600000);
    console.log('✅ Login Detected!');

    // Extract session info
    const sessionRes = await driver.executeScript(`
        const res = await fetch('${API_BASE_URL}/auth/session', { credentials: 'include' });
        return await res.json();
    `).catch(() => null);

    const email = sessionRes?.user?.email || 'unknown';
    const perm = sessionRes?.user?.perm || 'unknown';

    // Transfer cookies to axios via default Cookie header
    const seleniumCookies = await driver.manage().getCookies();
    const cookieString = seleniumCookies.map(c => `${c.name}=${c.value}`).join('; ');

    const client = axios.create({
        baseURL: API_BASE_URL,
        validateStatus: () => true,
        headers: {
            Cookie: cookieString
        }
    });

    console.log(`   Cookies transferred (${email}, perm=${perm}). ${seleniumCookies.length} cookies captured.`);
    return { client, email };
}

// ============================================================================
// MAIN
// ============================================================================
async function runHybridTest() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         CEiVoice — Automated API Test Suite (UAT)       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`  Started at: ${new Date().toISOString()}`);
    console.log(`  API Base:   ${API_BASE_URL}`);
    console.log(`  Login URL:  ${LOGIN_URL}\n`);

    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // ====================================================================
        // Step 1: Single Login (solve CAPTCHA once)
        // ====================================================================
        const { client, email } = await loginWithSelenium(driver);
        setShared('adminEmail', email);
        setShared('userEmail', email);

        // Role-switching helper — uses POST /auth/role to change perm
        const roleNames = { [ROLE_USER]: 'User (1)', [ROLE_ASSIGNEE]: 'Assignee (2)', [ROLE_ADMIN]: 'Admin (4)' };
        async function setRole(role) {
            const res = await client.post('/auth/role', { role });
            if (res.status === 200) {
                console.log(`\n🔄 Role switched to ${roleNames[role] || role}`);
            } else {
                console.error(`\n❌ Failed to switch role to ${role}: ${res.status} ${res.data?.message || ''}`);
            }
            return res;
        }

        // Pass the same client as both adminClient and userClient
        // Role is swapped before each test group
        const clients = { adminClient: client, userClient: client };
        const helpers = { recordTest, fail, assertTrue, sleep, printStep, getShared, setShared };

        console.log('\n--- Cookie Transferred. Starting API Tests ---');
        console.log('   (Roles will be swapped automatically via POST /auth/role)\n');

        // ====================================================================
        // Step 2: Run Test Modules (grouped by required role)
        // ====================================================================

        // --- Auth (no specific role needed, test with current) ---
        await setRole(ROLE_USER);
        await runModule('Auth Routes', authRoutesTest, clients, helpers);

        // --- User-level routes (perm=1) ---
        await setRole(ROLE_USER);
        await runModule('Ticket Routes', ticketRoutesTest, clients, helpers);

        // --- Public routes (no auth needed) ---
        await runModule('Ticket Public Routes', ticketPublicRoutesTest, clients, helpers);

        // --- Admin routes (perm=4) ---
        await setRole(ROLE_ADMIN);
        await runModule('Ticket Internal Routes (Admin)', ticketInternalRoutesTest, clients, helpers);
        await runModule('Ticket Admin Routes', ticketAdminRoutesTest, clients, helpers);
        await runModule('Report Routes (Admin)', reportAdminTest, clients, helpers);
        await runModule('User Admin Routes', userAdminRoutesTest, clients, helpers);
        await runModule('Admin Routes', adminRoutesTest, clients, helpers);

        // --- Assignee routes (perm=2) ---
        await setRole(ROLE_ASSIGNEE);
        await runModule('Ticket Assignee Routes', ticketAssigneeRoutesTest, clients, helpers);
        await runModule('Report Routes (Assignee)', reportAssigneeTest, clients, helpers);
        await runModule('Assignee Routes', assigneeRoutesTest, clients, helpers);

        // --- Restore original role ---
        await setRole(ROLE_ADMIN);
        console.log('\n   Role restored to Admin.');

    } catch (e) {
        console.error('\n❌ Fatal Error:', e.message);
    } finally {
        await driver.quit();
    }

    // ====================================================================
    // Step 3: Print Summary
    // ====================================================================
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                    TEST RESULTS SUMMARY                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;
    const total = testResults.length;

    // Column widths
    const nameWidth = 48;
    const statusWidth = 6;

    console.log(`  ${'Test'.padEnd(nameWidth)} ${'Status'.padEnd(statusWidth)}  Message`);
    console.log(`  ${'─'.repeat(nameWidth)} ${'─'.repeat(statusWidth)}  ${'─'.repeat(30)}`);

    testResults.forEach(result => {
        const icon = result.passed ? '✓ PASS' : '✗ FAIL';
        const name = result.name.length > nameWidth
            ? result.name.substring(0, nameWidth - 3) + '...'
            : result.name.padEnd(nameWidth);
        console.log(`  ${name} ${icon}  ${result.message}`);
    });

    console.log(`\n  ${'─'.repeat(nameWidth + statusWidth + 32)}`);
    console.log(`  Total: ${total} | ✓ Passed: ${passed} | ✗ Failed: ${failed}`);
    console.log(`  Finished at: ${new Date().toISOString()}`);
    console.log('');

    if (failed > 0) {
        process.exit(1);
    }
}

async function runModule(name, fn, clients, helpers) {
    try {
        await fn(clients, helpers);
    } catch (e) {
        console.error(`\n❌ CRITICAL ERROR in ${name}: ${e.message}`);
        testResults.push({ name: `[MODULE] ${name}`, passed: false, message: `Module crashed: ${e.message}` });
    }
}

runHybridTest();