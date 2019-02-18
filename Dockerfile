FROM node:8.0.0

WORKDIR /tmp

COPY package.json /tmp/
COPY package-lock.json /tmp/
RUN npm install

WORKDIR /opt/app
COPY . .
RUN cp -a /tmp/node_modules /opt/app


ARG PORT=60900
ENV PORT $PORT
EXPOSE $PORT

ENV NODE_ENV="production"

RUN npm run build

CMD ["npm", "start"]
