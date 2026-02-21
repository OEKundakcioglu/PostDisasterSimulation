# Stage 1: Build Spring Boot Backend
FROM eclipse-temurin:21-jdk AS builder-backend

WORKDIR /app

# Copy Gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle* .

# Make gradlew executable
RUN chmod +x gradlew

# Copy source code
COPY src src

# Build the application
RUN ./gradlew bootJar --no-daemon

# Stage 2: Build Next.js Frontend
FROM node:20-alpine AS builder-frontend

WORKDIR /app

# Copy package files
COPY post-disaster-kpi-ui/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY post-disaster-kpi-ui .

# Set production API URL (empty = same origin via nginx proxy)
ENV NEXT_PUBLIC_API_URL=""

# Build Next.js in standalone mode
RUN npm run build

# Stage 3: Production Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install Node.js and nginx
RUN apk add --no-cache nodejs npm nginx gettext

# Copy nginx config template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy Spring Boot JAR
COPY --from=builder-backend /app/build/libs/*.jar app.jar

# Copy Next.js standalone build
COPY --from=builder-frontend /app/.next/standalone ./frontend
COPY --from=builder-frontend /app/.next/static ./frontend/.next/static
COPY --from=builder-frontend /app/public ./frontend/public

# Copy startup script
COPY start.sh .
RUN chmod +x start.sh

# Default port (Railway overrides with PORT env var)
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start all services
CMD ["./start.sh"]
