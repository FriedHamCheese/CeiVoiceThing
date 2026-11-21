# Use an official lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency files first (optimizes caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your backend application code
COPY . .

# Expose the port your backend runs on
EXPOSE 5001

# Command to start the backend server
CMD ["npm", "start"]