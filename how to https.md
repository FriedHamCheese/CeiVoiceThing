# How to HTTPS
HTTPS between frontend to client is easy with vite's basicssl, so both frontend and backend assumes frontend is on https.
Backend on https requires certificate and key, so on both env files of frontend and backend, 
you can toggle backend using https or not.

- go to google cloud console and add https urls for both frontend and backend, keep the original alr

## Getting the key and certificate
- Windows: get openssl build from Shining light Productions, openssl is just code
  - rip to putt using mac :sob:
- Install it and navigate to its bin directory, start terminal there and call
  ```
  openssl req -x509 -out localhost.crt -keyout localhost.key -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost"
  
  - req: make certificate request
  - x509: X.509 certificate standard, now outputs certificate instead of request
  - out localhost.crt: certificate, you can change names but also have to change server.js
  - keyout localhost.key: like certificate but key
  - newkey rsa:2048: rsa key ig
  - nodes so it doesn't ask you to have password over the key
  - subj "/CN=localhost": certificate for localhost domain
  ```

- install localhost.crt with the option to place the certificate in the following store: Trusted Root...
  - gonna warn a bit, just remember to uninstall it later kek
- take both files and put it into /backend
- set USE_HTTPS to TRUE in backend's env
- set VITE_USE_HTTPS_BACKEND to TRUE in frontend's env