# Both the tag and sha digest are needed: the digest pins the exact image for reproducibility,
# and the tag allows Dependabot to evaluate version constraints
FROM node:24-bookworm@sha256:050bf2bbe33c1d6754e060bec89378a79ed831f04a7bb1a53fe45e997df7b3bb

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
