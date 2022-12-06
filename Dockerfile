FROM node:19
ENV NODE_ENV=production

COPY . .
RUN npm cache clean --force

RUN npm install -g gulp
RUN npm install gulp
RUN npm install


RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start-public"]
