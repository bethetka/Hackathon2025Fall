FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY .yarnrc.yml ./

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable

COPY . .
RUN yarn build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.pnp.cjs ./
COPY --from=builder /app/.yarnrc.yml ./

ENV NODE_ENV=production

CMD ["node", "dist/index.js"] # Replace with your actual entry point