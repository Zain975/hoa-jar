FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install app dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm ci

# Copy the rest of the code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Expose port
EXPOSE 3000

# Run Prisma migrations on container startup, then start the app
CMD npx prisma migrate deploy && npm run start:prod