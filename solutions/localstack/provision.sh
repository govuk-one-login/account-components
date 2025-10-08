#!/bin/bash

set -e

export AWS_PAGER=""

generate_keys() {
  echo "Starting to generate keys"

  # 1. Generate ECDSA Private Key (NIST P-256) to string
  EC_PRIVATE_KEY=$(openssl ecparam -name prime256v1 -genkey | openssl pkcs8 -topk8 -nocrypt -outform PEM)

  # 2. Extract ECDSA Public Key from private key string
  EC_PUBLIC_KEY=$(echo "$EC_PRIVATE_KEY" | openssl ec -pubout)

  # 3. Generate RSA private key to string
  RSA_PRIVATE_KEY=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 | openssl pkcs8 -topk8 -nocrypt -outform PEM)

  # 4. Extract RSA Public Key from private key string
  RSA_PUBLIC_KEY=$(echo "$RSA_PRIVATE_KEY" | openssl rsa -pubout)

  # Optional: escape newlines for SSM if needed (AWS CLI handles newlines well for string params, so usually no need)
  # But if you're sending to JSON or a place where newlines break things, you could use:
  # EC_PRIVATE_KEY_ESCAPED=$(echo "$EC_PRIVATE_KEY" | awk '{printf "%s\\n", $0}')

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
    --name "/components-mocks/EcPrivateKey" \
    --value "${EC_PRIVATE_KEY}" \
    --type "${STRING}" \
    --overwrite

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-mocks/EcPublicKey" \
    --value "${EC_PUBLIC_KEY}" \
    --type "${STRING}" \
    --overwrite

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-mocks/RsaPrivateKey" \
    --value "${RSA_PRIVATE_KEY}" \
    --type "${STRING}" \
    --overwrite

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-mocks/RsaPublicKey" \
    --value "${RSA_PUBLIC_KEY}" \
    --type "${STRING}" \
    --overwrite
  
  echo "Finished creating SSM parameters"
  return 0
}

create_dynamodb_tables() {
  echo "Creating DynamoDB tables"

  # Delete existing tables
  aws --endpoint-url=http://localhost:4566 dynamodb delete-table --table-name "components-main-UserInfo" 2>/dev/null || true
  aws --endpoint-url=http://localhost:4566 dynamodb delete-table --table-name "components-main-SessionStore" 2>/dev/null || true
  aws --endpoint-url=http://localhost:4566 dynamodb delete-table --table-name "components-main-AuthCode" 2>/dev/null || true
  aws --endpoint-url=http://localhost:4566 dynamodb delete-table --table-name "components-main-ReplayAttack" 2>/dev/null || true

  # UserInfoTable
  aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name "components-main-UserInfo" \
    --attribute-definitions \
      AttributeName=outcome_id,AttributeType=S \
      AttributeName=outcome_type,AttributeType=S \
      AttributeName=access_token,AttributeType=S \
    --key-schema \
      AttributeName=outcome_id,KeyType=HASH \
      AttributeName=outcome_type,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[{"IndexName":"AccessTokenIndex","KeySchema":[{"AttributeName":"access_token","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}]'

  # SessionsTable
  aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name "components-main-SessionStore" \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=user_id,AttributeType=S \
    --key-schema \
      AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --global-secondary-indexes '[{"IndexName":"users-sessions","KeySchema":[{"AttributeName":"user_id","KeyType":"HASH"}],"Projection":{"ProjectionType":"KEYS_ONLY"}}]'

  # AuthCodeTable
  aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name "components-main-AuthCode" \
    --attribute-definitions \
      AttributeName=code,AttributeType=S \
    --key-schema \
      AttributeName=code,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  # ReplayAttackTable
  aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name "components-main-ReplayAttack" \
    --attribute-definitions \
      AttributeName=nonce,AttributeType=S \
    --key-schema \
      AttributeName=nonce,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  echo "Finished creating DynamoDB tables"
  return 0
}

list_resources() {
  echo "List resources"
  ENDPOINT_URL="http://localhost:4566"

  # List all parameter names
  PARAM_NAMES=$(aws ssm describe-parameters \
    --endpoint-url "$ENDPOINT_URL" \
    --query "Parameters[*].Name" \
    --output text)

  echo "Listing SSM parameters from LocalStack..."

  for NAME in $PARAM_NAMES; do
    VALUE=$(aws ssm get-parameter \
      --endpoint-url "$ENDPOINT_URL" \
      --name "$NAME" \
      --with-decryption \
      --query "Parameter.Value" \
      --output text)

    echo "$NAME = $VALUE"
  done

  aws --endpoint-url=http://localhost:4566 dynamodb list-tables
  return 0
}

generate_keys
install_dependencies
configure_cli_for_localstack
start_localstack
create_ssm_parameters
create_dynamodb_tables
list_resources

echo "Localstack provisioned successfully"