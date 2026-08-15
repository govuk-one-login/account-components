# Despite what SonarQube says both the tag and sha digest are needed:
# the digest pins the exact image for reproducibility,
# the tag allows Dependabot to evaluate version constraints
FROM node:24.19.0-bookworm@sha256:934240a162082fd8b8a2f90cd5114446443f1eba1c5378f6687167ca405e6584

RUN curl --proto =https -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws
ENV AWS_PAGER=""

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY .npmrc .npmrc
COPY .nvmrc .nvmrc

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npm ci && npm run install-browsers

COPY . .

HEALTHCHECK NONE

USER node

ENTRYPOINT [ "./run-tests.sh" ]
