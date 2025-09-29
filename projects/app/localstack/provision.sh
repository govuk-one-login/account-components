#!/bin/bash

set -e

EC_PRIVATE_KEY_FILE="./private_ecdsa.pem"
EC_PUBLIC_KEY_FILE="./public_ecdsa.pem"
RSA_PRIVATE_KEY_FILE="./rsa-private.key"
RSA_PUBLIC_KEY_FILE="./rsa-public.crt"

# 1. Generate ECDSA Private Key using curve prime256v1 (NIST P-256)
echo "Generating ECDSA (NIST P-256) private key..."
openssl ecparam -name prime256v1 -genkey -noout -out "$EC_PRIVATE_KEY_FILE"
openssl genpkey -algorithm RSA -out "$RSA_PRIVATE_KEY_FILE" -pkeyopt rsa_keygen_bits:2048

# 2. Extract Public Key from the Private Key
echo "Extracting public key..."
openssl ec -in "$EC_PRIVATE_KEY_FILE" -pubout -out "$EC_PUBLIC_KEY_FILE"
openssl rsa -in "$RSA_PRIVATE_KEY_FILE" -pubout -out "$RSA_PUBLIC_KEY_FILE"

# 3. Read keys into environment-safe string (newline escaped)
EC_PRIVATE_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "$EC_PRIVATE_KEY_FILE")
EC_PUBLIC_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "$EC_PUBLIC_KEY_FILE")
RSA_PRIVATE_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "$RSA_PRIVATE_KEY_FILE")
RSA_PUBLIC_KEY=$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "$RSA_PUBLIC_KEY_FILE")

echo "Installing dependencies..."

install_localstack() {
  echo " Install LocalStack and AWS CLI if not present!"
  pip3 install --quiet localstack awscli || true
  echo "Finished install localstack!"
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
  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-main/EcPrivateKey" \
    --value "$EC_PRIVATE_KEY" \
    --type "String" \
      2>/dev/null || true

    aws --endpoint-url=http://localhost:4566 ssm put-parameter \
        --name "/components-main/EcPublicKey" \
        --value "$EC_PUBLIC_KEY" \
        --type "String" \
          2>/dev/null || true

    aws --endpoint-url=http://localhost:4566 ssm put-parameter \
            --name "/components-main/RsaPrivateKey" \
            --value "$RSA_PRIVATE_KEY" \
            --type "String" \
              2>/dev/null || true

    aws --endpoint-url=http://localhost:4566 ssm put-parameter \
            --name "/components-main/RsaPublicKey" \
            --value "$RSA_PUBLIC_KEY" \
            --type "String" \
             2>/dev/null || true
}

list_resources() {
  aws --endpoint-url=http://localhost:4566 ssm describe-parameters
}


install_localstack
configure_cli_for_localstack
start_localstack
create_ssm_parameters
list_resources

echo "LocalStack provisioned successfully!"