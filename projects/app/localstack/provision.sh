#!/bin/bash

set -e

# 1. Generate ECDSA Private Key (NIST P-256) to string
echo "Generating ECDSA private key (in-memory)..."
EC_PRIVATE_KEY=$(openssl ecparam -name prime256v1 -genkey | openssl pkcs8 -topk8 -nocrypt -outform PEM)

# 2. Extract ECDSA Public Key from private key string
EC_PUBLIC_KEY=$(echo "$EC_PRIVATE_KEY" | openssl ec -pubout)

# 3. Generate RSA private key to string
echo "Generating RSA private key (in-memory)..."
RSA_PRIVATE_KEY=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 | openssl pkcs8 -topk8 -nocrypt -outform PEM)

# 4. Extract RSA Public Key from private key string
RSA_PUBLIC_KEY=$(echo "$RSA_PRIVATE_KEY" | openssl rsa -pubout)

# Optional: escape newlines for SSM if needed (AWS CLI handles newlines well for string params, so usually no need)
# But if you're sending to JSON or a place where newlines break things, you could use:
# EC_PRIVATE_KEY_ESCAPED=$(echo "$EC_PRIVATE_KEY" | awk '{printf "%s\\n", $0}')

echo "Installing dependencies..."

install_localstack() {
  echo "Install LocalStack and AWS CLI if not present..."
  pip3 install --quiet localstack awscli || true
  echo "Finished installing LocalStack!"
}

configure_cli_for_localstack() {
  echo "Configuring AWS CLI for LocalStack..."
  aws configure set aws_access_key_id test
  aws configure set aws_secret_access_key test
  aws configure set region eu-west-2
}

start_localstack() {
  echo "Starting LocalStack..."
  localstack start -d

  echo "⏳ Waiting for LocalStack to be ready..."
  until aws --endpoint-url=http://localhost:4566 s3 ls > /dev/null 2>&1; do
    echo "⌛ LocalStack not ready yet... retrying in 2s"
    sleep 2
  done

  echo "LocalStack is ready!"
}

create_ssm_parameters() {
  echo "Creating SSM parameters in LocalStack..."

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-main/EcPrivateKey" \
    --value "$EC_PRIVATE_KEY" \
    --type "String" || true

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-main/EcPublicKey" \
    --value "$EC_PUBLIC_KEY" \
    --type "String" || true

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-main/RsaPrivateKey" \
    --value "$RSA_PRIVATE_KEY" \
    --type "String" || true

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-main/RsaPublicKey" \
    --value "$RSA_PUBLIC_KEY" \
    --type "String" || true
}

list_resources() {
  aws --endpoint-url=http://localhost:4566 ssm describe-parameters
}

# Run steps
install_localstack
configure_cli_for_localstack
start_localstack
create_ssm_parameters
list_resources

echo "✅ LocalStack provisioned successfully!"
