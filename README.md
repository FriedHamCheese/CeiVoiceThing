# ATTENTION BRANCH REQUIRES MAJOR PROOFREADING BEFORE SUBMITTING.
## TO ACESS DASHBOARD CHANGE PERM VALUE TO 2 FOR ASSIGNEE; 4 FOR ADMIN.

# Setup
```
cd ../database
docker-compose -f db-compose-dev.yml up
cd ../backend
node setup.js
```
new terminal then run ollama if needed
```
ollama run llama3.2
```
new terminal:
```
cd ./frontend
npm install
npm run dev
```

new terminal:
```
cd ../backend
npm install
node server.js
```
