FROM node:13.14.0-alpine3.11

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm install -g nodemon
RUN npm install -g gulp-cli

EXPOSE 3000

COPY tsconfig.json ./
COPY gulpfile.js ./
ADD src/ src/

RUN gulp

CMD ["nodemon"]
