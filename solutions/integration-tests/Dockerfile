FROM node:22-bookworm@sha256:2bb201f33898d2c0ce638505b426f4dd038cc00e5b2b4cbba17b069f0fff1496

ADD https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip awscliv2.zip
RUN unzip awscliv2.zip && ./aws/install
ENV AWS_PAGER=""

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY .npmrc .npmrc
COPY .nvmrc .nvmrc

RUN npm ci && npm run install-browsers

COPY . .

ENTRYPOINT [ "./run-tests.sh" ]
