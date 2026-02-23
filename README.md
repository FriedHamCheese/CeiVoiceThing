# populate .env for backend
```
#Database
DATABASE_ROOT_PASSWORD = 
DATABASE_USERNAME = 
DATABASE_PASSWORD = 
DATABASE_NAME = 
DATABASE_HOST = 
SERVER_PORT = 5001
FRONTEND_PORT = 5173

#Authentication
RECAPTCHA_SECRET_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

#LLM
#ORACLE is for LLM hosted on Oracle cloud, adjust the url, model, user, pass accordingly.
LLM_PROVIDER= #OPENAI, ORACLE
ORACLE_URL=
ORACLE_MODEL=
ORACLE_USER=
ORACLE_PASS=
OPENAI_API_KEY=
SAFTY_FALLBACK_EMAIL=admin@example.com

#Email Notification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_PASS=
```

# populate .env for frontend
```
VITE_API_HOST=localhost
VITE_API_PORT=5001
VITE_RECAPTCHA_SITE_KEY=
```

# Setup One Shot
```
cd backend/database && \
docker-compose --env-file ../.env -f db-compose-dev.yml up -d && \
echo "Docker started... waiting 30s for Database to initialize..." && \
sleep 30 && \
cd .. && \
npm install && \
cd database && \
node setup.js && \
cd ../../frontend && \
npm install && \
echo "Environment setup complete!"
```