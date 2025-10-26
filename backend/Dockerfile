FROM node:20-alpine AS builder

WORKDIR /app

COPY . .
RUN corepack enable
RUN yarn set version latest

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable

RUN yarn build

FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.yarnrc.yml ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"] # Replace with your actual entry point