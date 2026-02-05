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
set OPENAI_API_KEY=YOUR_KEY; get YOUR_KEY from OPENAI xd
node server.js
```
