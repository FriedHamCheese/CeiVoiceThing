```
cd [Project root folder]
```
```
cd ../database
```
have docker running
```
docker-compose -f db-compose-dev.yml up
```
bring up phpmyadmin, log in as root and drop setup.sql into it
__________________
setup dotenv file in backend folder
```
cd ./backend
touch .env
```

add this in dotenv file:
```
OPENAI_API_KEY="your key"
```

new terminal:
```
cd ./backend
npm install
node server.js
```

new terminal:
```
cd ../frontend
npm install
npm run dev
```
