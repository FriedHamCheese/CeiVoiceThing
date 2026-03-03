# CeiVoice

CeiVoice is a full-stack web application designed for ticket tracking and management, built with React, Vite, Material-UI on the frontend, and Node.js, Express, MySQL on the backend, with OpenAI integration.

## Prerequisites
- **Node.js**: v18 or higher recommended
- **Docker**: For running the MySQL database containers
- **npm** or **yarn**

## Setup Instructions

### 1. Environment Variables

Create and populate a `.env` file at the root of the project with the following structure:

```env
# Database
DATABASE_ROOT_PASSWORD = 
DATABASE_USERNAME = 
DATABASE_PASSWORD = 
DATABASE_NAME = 
DATABASE_HOST = localhost
SERVER_PORT = 5001
FRONTEND_PORT = 5173

# Authentication
RECAPTCHA_SECRET_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# LLM
# ORACLE is for LLM hosted on Oracle cloud and classification system, adjust the url, model, user, pass accordingly.
LLM_PROVIDER= # OPENAI or ORACLE
ORACLE_URL=
ORACLE_MODEL=
ORACLE_USER=
ORACLE_PASS=
OPENAI_API_KEY=
SAFTY_FALLBACK_EMAIL=admin@example.com

# Email Notification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

Create and populate `.env` in the `frontend` directory:

```env
VITE_API_HOST=localhost
VITE_API_PORT=5001
VITE_RECAPTCHA_SITE_KEY=
```

### 2. Automatic Setup

We provide automated setup scripts that initialize the database container, wait for it to be ready, install both backend and frontend dependencies, and run the necessary database migrations (`setup.js`).

**For Windows (Command Prompt / PowerShell):**
```cmd
.\setup.bat
```

**For macOS / Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Run the Development Servers

After the setup is successfully completed, you can start the development servers.

**Backend Development:**
```bash
cd backend
npm run dev
```

**Frontend Development:**
```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5501` (as configured by Vite) and the backend on `http://localhost:5001`.