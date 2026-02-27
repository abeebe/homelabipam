FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev=false

# Copy source
COPY . .

# Build client + server
RUN npm run build

# Generate Prisma client for production
RUN npx prisma generate --schema=app/prisma/schema.prisma

# Remove dev dependencies to slim the image
RUN npm prune --omit=dev

EXPOSE 3000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
