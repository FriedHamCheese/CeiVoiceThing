# CeiVoice

CeiVoice is a full-stack web application designed for ticket tracking and management, built with React, Vite, Material-UI on the frontend, and Node.js, Express, MySQL on the backend, with OpenAI integration.

## Features
- [x] Create and track requests as user
- [x] LLM summarizes request, provide title, suggest assignee, possible solutions and turn the request into a draft ticket
- [x] Admin can edit, merge or assign tickets
- [x] LLM can provide possible ticket merge, combining many requests/tickets into one before marking ticket as assigned
- [x] Assignee has permission to change status of their assigned tickets, or reassign to anothe assignee
- [x] Users, assignees and admin can chat in the ticket, with assignees and admin having an internal visibility message option
- [x] Email notification for anyone involved with a ticket

<img width="1794" height="889" alt="Screenshot_22-11-2026_113711_ceivoice shoveitin me" src="https://github.com/user-attachments/assets/5402d4ed-fb10-483a-adc2-70e39e55b3cd" />
<img width="1794" height="889" alt="Screenshot_22-11-2026_113658_ceivoice shoveitin me" src="https://github.com/user-attachments/assets/5e0a2eb1-822e-4c7b-8b3b-6d7129c71430" />
<img width="1794" height="889" alt="Screenshot_22-11-2026_112751_ceivoice shoveitin me" src="https://github.com/user-attachments/assets/406af301-933f-448e-9eae-78b4800c8af2" />
<img width="1794" height="889" alt="Screenshot_22-11-2026_113741_ceivoice shoveitin me" src="https://github.com/user-attachments/assets/66fdf732-ed30-46c7-b1ce-16ade09517ef" />

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
