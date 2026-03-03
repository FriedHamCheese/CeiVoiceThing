# --- Stage 1: Build the Vite frontend ---
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code and build the project
COPY . .
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Vite outputs compiled files to the 'dist' folder by default
COPY --from=build /app/dist /usr/share/nginx/html

# Update Nginx to listen on port 5501 instead of 80
RUN sed -i 's/listen  *80;/listen 5501;/g' /etc/nginx/conf.d/default.conf

# Expose port 5501 for Nginx
EXPOSE 5501

CMD ["nginx", "-g", "daemon off;"]