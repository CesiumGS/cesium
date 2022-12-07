FROM node:16

RUN chgrp -R 0 /usr && \
    chmod -R g=u /usr
RUN useradd -ms /bin/bash user && usermod -a -G root user

WORKDIR /usr/app
RUN curl -L https://npmjs.org/install.sh | sh
COPY . .
RUN npm cache clean --force

RUN npm install -g gulp
RUN npm install gulp
RUN npm install --production
RUN npm run build

USER user
EXPOSE 8080

CMD ["npm", "run", "start-public"]
