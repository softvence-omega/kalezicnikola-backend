

# ------------------------
# Stage 1: Builder
# ------------------------
FROM node:20-bullseye AS builder

# Install required system dependencies
RUN apt-get update && apt-get install -y \
  python3 make g++ gcc postgresql-client \
  && ln -sf python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

# Create app directory and set permissions
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app
WORKDIR /usr/src/app
USER node

# Copy package files and install dependencies
COPY --chown=node:node package*.json ./
RUN npm ci

# Configure npm global path
RUN mkdir -p /home/node/.npm-global && \
    npm config set prefix /home/node/.npm-global && \
    echo 'export PATH=/home/node/.npm-global/bin:$PATH' >> /home/node/.bashrc
ENV PATH=/home/node/.npm-global/bin:$PATH

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy the rest of the source code
COPY --chown=node:node . .

# Build the NestJS application
RUN npm run build


# ------------------------
# Stage 2: Runtime
# ------------------------
FROM node:20-bullseye AS runtime

# Install minimal dependencies needed for runtime
RUN apt-get update && apt-get install -y \
  python3 make g++ gcc postgresql-client \
  && ln -sf python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

# Create app directory and set permissions
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app
WORKDIR /usr/src/app
USER node

# Copy compiled build and required files from builder
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/prisma ./prisma
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./

# Set environment variables
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}
EXPOSE 5000

# ------------------------
# CMD: Wait for Postgres, then migrate and start the app
# ------------------------
CMD ["bash", "-c", "\
  until pg_isready -h postgres_db -p 5432 -U postgres; do \
    echo '⏳ Waiting for PostgreSQL...'; \
    sleep 2; \
  done; \
  echo '🚀 PostgreSQL is ready! Running migrations...'; \
  npx prisma migrate deploy && \
  echo '✅ Starting NestJS...'; \
  if [ \"$NODE_ENV\" = \"production\" ]; then \
    node dist/main.js; \
  else \
    npm run start:dev; \
  fi"]
