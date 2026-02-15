# Setup
```
cd ../database
docker-compose -f db-compose-dev.yml up
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
node setup.js
node server.js
```
