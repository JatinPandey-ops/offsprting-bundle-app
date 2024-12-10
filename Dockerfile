# Use Node.js 20 as the base image for better compatibility with Shopify packages
FROM node:20-alpine

# Install OpenSSL dependencies first
RUN apk add --no-cache openssl openssl1.1-compat

# Expose port 3000 for the web server
EXPOSE 3000

# Set working directory
WORKDIR /app

# Add build-time arguments for database configuration
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files
COPY . .

# Generate Prisma client and build the application
RUN npm run build

# Create a .env file with database configuration
RUN echo "DATABASE_URL=$DATABASE_URL" > .env

# Start the application with migrations and server
CMD ["npm", "run", "docker-start"]