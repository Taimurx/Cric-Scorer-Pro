# ========================================================
# Cric Scorer Pro — Enterprise Production Dockerfile
# Base: Node.js Alpine (Minimal, Secure, High Performance)
# ========================================================

FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy package descriptors
COPY package.json ./

# Copy all application assets
COPY . .

# Run as non-root user for enterprise container security
USER node

# Expose standard application port
EXPOSE 3000

# Container Healthcheck (polls /healthz every 30s)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

# Start enterprise production server
CMD ["node", "server.js"]
