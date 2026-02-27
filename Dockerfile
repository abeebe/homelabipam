FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev=false

# Copy source
COPY . .

# Generate Prisma client BEFORE building so TypeScript has the generated types
RUN npx prisma generate

# Build client + server
RUN npm run build

# Remove dev dependencies to slim the image
RUN npm prune --omit=dev

EXPOSE 3000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
