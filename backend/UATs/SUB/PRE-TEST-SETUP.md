# UAT-SUB Pre-Test Setup Checklist

Use this checklist before running:
- `backend/UATs/SUB/UAT User.js`
- `backend/UATs/SUB/UAT User E2E Solve.js`

## Quick Start: Set Environment Variables

**For basic UAT User.js tests:**

UAT User.js = "Can users submit tickets and see them?"

UAT User E2E Solve.js = "Does the entire workflow from submission to resolution work?"

```powershell
$env:UAT_API_URL="http://localhost:5001"
$env:UAT_USER_EMAIL="user@example.com"
$env:UAT_USER_PASSWORD="YourUserPassword"
node "backend/UATs/SUB/UAT User.js"
```

**For E2E Solve tests:**

```powershell
$env:UAT_API_URL="http://localhost:5001"
$env:UAT_USER_EMAIL="user@example.com"
$env:UAT_USER_PASSWORD="YourUserPassword"
$env:UAT_ADMIN_EMAIL="admin@example.com"
$env:UAT_ADMIN_PASSWORD="YourAdminPassword"
node "backend/UATs/SUB/UAT User E2E Solve.js"
```

> **Note:** The dummy users from `setup.sql` include `user@example.com` (perm=1) and `admin@example.com` (perm=3). You must set actual passwords for these accounts in your database (the hashes in setup.sql are placeholders). 
> **You may need to leave RECAPTCHA_SECRET_KEY empty in backend .env if you want to skip Captcha**

---

## 1) Services must be running

- [ ] Backend API is running (`SERVER_PORT`, usually `5001`)
- [ ] Database is running and connected to backend
- [ ] Frontend is optional for API script execution

Quick health check:

```powershell
Invoke-WebRequest -Uri http://localhost:5001/auth/session -Method GET -UseBasicParsing
```

Expected: HTTP `401` is OK (means API is alive, just not authenticated yet).

## 2) Environment variable reference

### For `UAT User.js`

**Auto-Login (Recommended):**
- `UAT_USER_EMAIL` - user account email (e.g., `user@example.com`)
- `UAT_USER_PASSWORD` - user account password
- Optional: `UAT_API_URL` (default auto-detect tries `5001`, then `3000`)
- Optional: `UAT_EXPECT_AUTH_SESSION=true`
- Optional: `UAT_EXPECT_STATUS=Solved`
- Optional: `UAT_SKIP_CAPTCHA=false` (when captcha required, also set `UAT_CAPTCHA_TOKEN`)

**Manual Session Cookie (fallback):**
- `UAT_USER_EMAIL`
- `UAT_SESSION_COOKIE` or `UAT_USER_SESSION_COOKIE` - full `Cookie` header value

### For `UAT User E2E Solve.js`

**Auto-Login (Recommended):**
- `UAT_USER_EMAIL` - user account email (e.g., `user@example.com`)
- `UAT_USER_PASSWORD` - user account password
- `UAT_ADMIN_EMAIL` - admin account email (e.g., `admin@example.com`)
- `UAT_ADMIN_PASSWORD` - admin account password
- Optional: `UAT_API_URL` (default auto-detect tries `5001`, then `3000`)
- Optional: `UAT_REQUEST_TEXT`
- Optional: `UAT_SOLVED_COMMENT`
- Optional: `UAT_SKIP_CAPTCHA=false` (when captcha required, also set `UAT_CAPTCHA_TOKEN`)

**Manual Session Cookies (fallback):**
- `UAT_USER_EMAIL`
- `UAT_USER_SESSION_COOKIE`
- `UAT_ADMIN_EMAIL`
- `UAT_ADMIN_SESSION_COOKIE`

## 3) Account requirements

- [ ] User account exists with `perm = 1` (from `setup.sql`: `user@example.com`)
- [ ] Admin account exists with `perm = 3` or `4` (from `setup.sql`: `admin@example.com`)
- [ ] Passwords are set correctly in database (not the `$2b$10$example_hash_here` placeholder)
- [ ] Captcha is disabled in backend `.env` **or** you have `UAT_CAPTCHA_TOKEN` set

### How to get session cookie manually (if not using auto-login)

1. Log in via browser as the target user/admin
2. Open DevTools (`F12`) → **Application** tab → **Cookies**
3. Find session cookie under your backend domain
4. Copy entire value and set as `UAT_USER_SESSION_COOKIE` or `UAT_ADMIN_SESSION_COOKIE`

## 4) Data + workflow assumptions

- [ ] AI draft creation path is functional (request -> draft ticket)
- [ ] Admin can access `/admin/tickets` endpoints
- [ ] Public tracking endpoint is accessible: `/public/tickets/track/:token?email=...`

## 5) Failure quick-map

- `Cannot reach backend API` → wrong URL/port or backend not running
- `Missing UAT_USER_EMAIL and UAT_USER_PASSWORD` → auto-login enabled but credentials not set
- `Login failed` → wrong password or account doesn't exist
- `401` on protected endpoints → session expired or invalid
- `403` on admin endpoints → session user is not admin (`perm` < 3)
- `Resolution comment is required` → status set to `Solved`/`Failed` without comment
- `Captcha verification failed` → set `UAT_SKIP_CAPTCHA=false` or disable captcha in backend `.env`
