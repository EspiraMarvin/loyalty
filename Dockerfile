#  Build
FROM node:22-alpine AS builder

# Install OpenSSL required by prisma on Alpine
RUN apk add --no-cache openssl

# install pnpm
RUN npm install -g pnpm

# set working directory
WORKDIR /app

# copy package files
COPY package.json pnpm-lock.yaml ./

# copy Prisma schema 
COPY prisma ./prisma

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build the application
RUN pnpm build

#  Production
FROM node:22-alpine AS production

# Install OpenSSL required by prisma on Alpine
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# install prisma CLI and ts-node globally, for migrations & db seeding
RUN npm install -g prisma@5.22.0 ts-node@10.9.2 typescript@5.7.3 @types/node@22.10.7

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules/@types ./node_modules/@types

# Copy startup script and make it executable
COPY start.sh ./
RUN chmod +x start.sh

# Copy tsconfig for seed script
COPY tsconfig.json ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
