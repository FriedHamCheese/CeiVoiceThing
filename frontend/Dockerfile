# --- Stage 1: Build the Vite frontend ---
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Accept build arguments
ARG VITE_API_HOST
ARG VITE_API_PORT
# Set environment variables for Vite
ENV VITE_API_HOST=$VITE_API_HOST
ENV VITE_API_PORT=$VITE_API_PORT

# Copy the rest of the code and build the project
COPY . .
RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Vite outputs compiled files to the 'dist' folder by default
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 5501 for Nginx
EXPOSE 5501

CMD ["nginx", "-g", "daemon off;"]