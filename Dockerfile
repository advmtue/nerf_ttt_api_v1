FROM node:latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm install -g nodemon
RUN npm install -g gulp-cli

EXPOSE 3000

COPY tsconfig.json ./
COPY gulpfile.js ./
ADD src/ src/
ADD models/ models/

RUN gulp

CMD ["nodemon"]
