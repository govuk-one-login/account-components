#!/bin/bash

set -e

generate_keys() {
  echo "Starting to generate keys"

  mkdir -p ./solutions/localstack/keys
  
  EC_PRIVATE_KEY_FILE="./solutions/localstack/keys/private_ecdsa.pem"
  EC_PUBLIC_KEY_FILE="./solutions/localstack/keys/public_ecdsa.pem"
  RSA_PRIVATE_KEY_FILE="./solutions/localstack/keys/rsa-private.key"
  RSA_PUBLIC_KEY_FILE="./solutions/localstack/keys/rsa-public.crt"

  echo "Generating private keys"
  openssl ecparam -name prime256v1 -genkey -noout -out "${EC_PRIVATE_KEY_FILE}"
  openssl genpkey -algorithm RSA -out "${RSA_PRIVATE_KEY_FILE}" -pkeyopt rsa_keygen_bits:2048

  echo "Extracting public keys"
  openssl ec -in "${EC_PRIVATE_KEY_FILE}" -pubout -out "${EC_PUBLIC_KEY_FILE}"
  openssl rsa -in "${RSA_PRIVATE_KEY_FILE}" -pubout -out "${RSA_PUBLIC_KEY_FILE}"

  echo "Reading keys into environment variables"
  AWK_FORMAT_PATTERN='NF {sub(/\r/, ""); printf "%s\\n",$0;}'
  EC_PRIVATE_KEY=$(awk "${AWK_FORMAT_PATTERN}" "${EC_PRIVATE_KEY_FILE}")
  EC_PUBLIC_KEY=$(awk "${AWK_FORMAT_PATTERN}" "${EC_PUBLIC_KEY_FILE}")
  RSA_PRIVATE_KEY=$(awk "${AWK_FORMAT_PATTERN}" "${RSA_PRIVATE_KEY_FILE}")
  RSA_PUBLIC_KEY=$(awk "${AWK_FORMAT_PATTERN}" "${RSA_PUBLIC_KEY_FILE}")

  echo "Finished generating keys"
  return 0
}

install_dependencies() { 
  echo "Starting to install dependencies"
 
  if ! command -v localstack >/dev/null 2>&1; then
    echo "Installing Localstack"

    if command -v brew >/dev/null 2>&1; then
      brew install localstack || true
    else
      pip3 install --quiet localstack || true
    fi
  fi
  
  if ! command -v aws >/dev/null 2>&1; then
    echo "Installing AWS CLI"

    if command -v brew >/dev/null 2>&1; then
      brew install awscli || true
    else
      pip3 install --quiet awscli || true
    fi
  fi
  
  echo "Finished installing dependencies"
  return 0
}

configure_cli_for_localstack() {
  echo "Starting to configure AWS CLI for Localstack"

  aws configure set aws_access_key_id test
  aws configure set aws_secret_access_key test
  aws configure set region eu-west-2

  echo "Finished configuring AWS CLI for Localstack"
  return 0
}

start_localstack() {
  echo "Starting Localstack"

  localstack start -d

  until aws --endpoint-url=http://localhost:4566 s3 ls > /dev/null 2>&1; do
    echo "⌛ Localstack not ready yet, retrying in 2s"
    sleep 2
  done

  echo "Localstack is ready"
  return 0
}

create_ssm_parameters() {
  echo "Creating SSM parameters"

  STRING="String"

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-main/EcPrivateKey" \
    --value "${EC_PRIVATE_KEY}" \
    --type "${STRING}" \
      2>/dev/null || true

    aws --endpoint-url=http://localhost:4566 ssm put-parameter \
        --name "/components-main/EcPublicKey" \
        --value "${EC_PUBLIC_KEY}" \
        --type "${STRING}" \
          2>/dev/null || true

    aws --endpoint-url=http://localhost:4566 ssm put-parameter \
            --name "/components-main/RsaPrivateKey" \
            --value "${RSA_PRIVATE_KEY}" \
            --type "${STRING}" \
              2>/dev/null || true

    aws --endpoint-url=http://localhost:4566 ssm put-parameter \
            --name "/components-main/RsaPublicKey" \
            --value "${RSA_PUBLIC_KEY}" \
            --type "${STRING}" \
             2>/dev/null || true
  
  echo "Finished creating SSM parameters"
  return 0
}

list_resources() {
  echo "List resources"

  aws --endpoint-url=http://localhost:4566 ssm describe-parameters
  return 0
}

generate_keys
install_dependencies
configure_cli_for_localstack
start_localstack
create_ssm_parameters
list_resources

echo "Localstack provisioned successfully"