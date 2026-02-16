# Setup
Setup Docker:
```
cd backend/database
```
```
docker-compose -f db-compose-dev.yml up
```

Setup Ollama:
```
ollama run llama3.2
```

Setup Database:
```
cd backend
```
```
npm install
```
```
cd backend/database
```
```
node setup.js
```

Setup Backend:
```
cd backend
```
```
node server.js
```

Setup Frontend:
```
cd frontend
```
```
npm install
```
```
npm run dev
```


