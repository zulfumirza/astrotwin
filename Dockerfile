# AstroTwin — single container: Express API proxy + built web app.
# Works on Google Cloud Run, Render, Fly.io, Railway or any Docker host.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY server ./server
COPY src/engine ./src/engine
COPY src/i18n/findings.ts ./src/i18n/findings.ts
EXPOSE 8080
ENV PORT=8080
CMD ["npx", "tsx", "server.ts", "--prod"]
