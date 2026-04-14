# =============================================
# EBS - Einschulungsblatt Management System
# Multi-stage Docker Build
# =============================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx tsc

# Stage 3: Production Image
FROM node:20-alpine AS production
WORKDIR /app

# Install only production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled backend
COPY --from=backend-build /app/backend/dist ./dist

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create data directory for SQLite and documents
RUN mkdir -p /app/data /app/data/documents

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/ebs.db
ENV DOCUMENTS_PATH=/app/data/documents
ENV FRONTEND_DIST_PATH=/app/frontend/dist

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

EXPOSE 3001

# Run as non-root user for security
RUN addgroup -g 1001 -S ebs && \
    adduser -S ebs -u 1001 -G ebs && \
    chown -R ebs:ebs /app
USER ebs

CMD ["node", "dist/index.js"]
