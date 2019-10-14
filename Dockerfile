FROM keymetrics/pm2:10-alpine AS prod

WORKDIR /project
COPY . ./

RUN yarn --frozen-lockfile