# --- Stage 1: Build the Vite frontend ---
FROM node:20-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Accept build arguments
ARG VITE_API_URL
ARG VITE_RECAPTCHA_SITE_KEY
# Set environment variables for Vite
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

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