# ==========================================
# Cric Scorer Pro — Enterprise Dockerfile
# Lean, rootless Alpine-based Node.js runtime
# ==========================================

FROM node:22-alpine AS runtime

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Set working directory
WORKDIR /app

# Copy application files
COPY --chown=node:node package.json server.js index.html privacy.html 404.html favicon.png icon.png robots.txt sitemap.xml cricket_pro.apk ./
COPY --chown=node:node web ./web

# Least-privilege non-root execution
USER node

# Expose HTTP port
EXPOSE 3000

# Built-in container health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/healthz', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the enterprise server
CMD ["node", "server.js"]
