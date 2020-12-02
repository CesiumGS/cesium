FROM node:14 AS Builder

ARG NPM_TOKEN

# Configure git to use our custom credential helper that can use the $GITHUB_KEY env var
# This allows us to use the github token without writing it to disk. The sleep is required
# to avoid a race condition on some systems.
# https://git-scm.com/docs/api-credentials#_credential_helpers

ARG GITHUB_KEY

RUN git config --global credential.helper "!f() { sleep 0.1; echo 'username=${GITHUB_KEY}\npassword=x-oauth-basic'; }; f" && git config --global url."https://github.com/".insteadOf "git@github.com:"

WORKDIR /build

# Move the package into the container
COPY . /build

# Configure yarn to use NPM registry
RUN yarn config set registry "https://registry.npmjs.org"

# Set authToken for access to @propelleraero/* packages.
RUN npm config set "//registry.npmjs.org/:_authToken" ${NPM_TOKEN}

# Dependencies
RUN yarn install
