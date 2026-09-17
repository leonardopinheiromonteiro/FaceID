# DevSecOps Hardened Dockerfile
FROM node:22-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package manifests first for efficient caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose HTTP and HTTPS ports
EXPOSE 3000 3443

# Run as non-root user (Security Best Practice)
USER node

# Start server
CMD ["node", "server.js"]
