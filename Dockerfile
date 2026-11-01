# GOLDRIX Production Dockerfile for Render.com & Cloud Deployment
FROM node:22-alpine

WORKDIR /app

# Copy package manifests and npm config first for layer caching
COPY package*.json .npmrc ./

# Install all dependencies (including build tools for Vite)
RUN npm install --legacy-peer-deps --include=dev

# Copy full application source
COPY . .

# Ensure persistent data directory exists
RUN mkdir -p /app/data

# Build the production frontend bundle into /app/dist
RUN npm run build

# Set production environment defaults (Render automatically injects PORT)
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the Express + Static SPA server
CMD ["npm", "start"]
