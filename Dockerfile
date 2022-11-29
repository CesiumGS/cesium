FROM node:19
ENV NODE_ENV=production

# RUN sudo chown +WRX $USER /usr/local/lib/node_modules

# COPY package*.json ./
# COPY gulpfile.js ./
COPY . .

RUN npm install -g gulp
RUN npm install gulp
# RUN npm link gulp

RUN npm install

RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start-public"]
