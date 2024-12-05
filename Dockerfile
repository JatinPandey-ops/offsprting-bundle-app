FROM node:18-alpine

EXPOSE 3000

WORKDIR /app

# Add this section to handle build-time arguments
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production

# Copy dependency files first for better caching
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Remove CLI packages
RUN npm remove @shopify/cli

# Copy the rest of the application
COPY . .

# Create a .env file with the database URL
RUN echo "DATABASE_URL=$DATABASE_URL" > .env

# Generate Prisma client and build the application
RUN npm run build

# Remove development database file
RUN rm -f prisma/dev.sqlite

CMD ["npm", "run", "docker-start"]