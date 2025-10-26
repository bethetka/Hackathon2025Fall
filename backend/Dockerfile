FROM node:20-alpine

WORKDIR /app

COPY . .
RUN corepack enable
RUN yarn set version latest

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable

RUN yarn build

CMD ["yarn", "start"] 