#!/bin/bash

# 1. Set the working directory to the location of this script
cd "$(dirname "$0")" || exit 1

echo "[1/5] Starting backend database with Docker..."
cd backend/database || exit 1
docker compose --env-file ../.env -f db-compose-dev.yml up -d

# Check if Docker started successfully
if [ $? -ne 0 ]; then
    echo -e "\nERROR: Docker failed to start. Please ensure the Docker daemon is running."
    exit 1
fi

echo -e "\n[2/5] Docker started. Waiting 30s for Database to initialize..."
sleep 30

echo -e "\n[3/5] Installing backend dependencies..."
cd .. || exit 1
npm install
if [ $? -ne 0 ]; then
    echo -e "\nERROR: Backend 'npm install' failed."
    exit 1
fi

echo -e "\n[4/5] Running database setup..."
cd database || exit 1
node setup.js
if [ $? -ne 0 ]; then
    echo -e "\nERROR: Database setup.js failed. Check your script and .env variables."
    exit 1
fi

echo -e "\n[5/5] Installing frontend dependencies..."
cd ../../frontend || exit 1
npm install
if [ $? -ne 0 ]; then
    echo -e "\nERROR: Frontend 'npm install' failed."
    exit 1
fi

echo -e "\n========================================="
echo "Environment setup successfully completed!"
echo "========================================="