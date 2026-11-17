FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 PUPPETEER_SKIP_DOWNLOAD=true

FROM base AS web
ARG APP
COPY ${APP}/package.json ${APP}/package-lock.json ./
RUN npm ci --include=dev
COPY ${APP}/ ./
CMD ["npm", "run", "dev"]

FROM base AS server
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
    && ln -s /usr/bin/chromium /usr/bin/google-chrome \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --include=dev
COPY server/ ./
CMD ["npm", "run", "dev"]
