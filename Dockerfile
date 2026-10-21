FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
RUN mkdir -p server/uploads && chown -R node:node server/uploads

EXPOSE 5000
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then((res) => { if (!res.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "server/server.js"]
