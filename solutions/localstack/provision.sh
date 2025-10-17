#!/bin/bash

set -e

export AWS_PAGER=""

generate_keys() {
  echo "Starting to generate keys"

  # 1. Generate ECDSA Private Key (NIST P-256) to string
  MOCK_CLIENT_EC_PRIVATE_KEY=$(openssl ecparam -name prime256v1 -genkey | openssl pkcs8 -topk8 -nocrypt -outform PEM)

  # 2. Extract ECDSA Public Key from private key string
  MOCK_CLIENT_EC_PUBLIC_KEY=$(echo "$MOCK_CLIENT_EC_PRIVATE_KEY" | openssl ec -pubout)

  # Optional: escape newlines for SSM if needed (AWS CLI handles newlines well for string params, so usually no need)
  # But if you're sending to JSON or a place where newlines break things, you could use:
  # MOCK_CLIENT_EC_PRIVATE_KEY_ESCAPED=$(echo "$MOCK_CLIENT_EC_PRIVATE_KEY" | awk '{printf "%s\\n", $0}')

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

  # Delete existing parameters
  aws --endpoint-url=http://localhost:4566 ssm delete-parameter \
    --name "/components-mocks/MockClientEcPrivateKey" 2>/dev/null || true
  aws --endpoint-url=http://localhost:4566 ssm delete-parameter \
    --name "/components-mocks/MockClientEcPublicKey" 2>/dev/null || true

  STRING="String"

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-mocks/MockClientEcPrivateKey" \
    --value "${MOCK_CLIENT_EC_PRIVATE_KEY}" \
    --type "${STRING}"

  aws --endpoint-url=http://localhost:4566 ssm put-parameter \
    --name "/components-mocks/MockClientEcPublicKey" \
    --value "${MOCK_CLIENT_EC_PUBLIC_KEY}" \
    --type "${STRING}"
  
  echo "Finished creating SSM parameters"
  return 0
}

create_kms_keys() {
  echo "Creating KMS keys"

  # Delete existing alias
  aws --endpoint-url=http://localhost:4566 kms delete-alias \
    --alias-name alias/components-core-JARRSAEncryptionKey 2>/dev/null || true

  # Delete existing key
  EXISTING_KEY_ID=$(aws --endpoint-url=http://localhost:4566 kms list-aliases \
    --query "Aliases[?AliasName=='alias/components-core-JARRSAEncryptionKey'].TargetKeyId" \
    --output text 2>/dev/null || true)
  
  if [[ -n "$EXISTING_KEY_ID" ]] && [[ "$EXISTING_KEY_ID" != "None" ]]; then
    aws --endpoint-url=http://localhost:4566 kms schedule-key-deletion \
      --key-id "$EXISTING_KEY_ID" \
      --pending-window-in-days 7 2>/dev/null || true
  fi

  KEY_ID=$(aws --endpoint-url=http://localhost:4566 kms create-key \
    --key-spec RSA_2048 \
    --key-usage ENCRYPT_DECRYPT \
    --origin AWS_KMS \
    --query 'KeyMetadata.KeyId' \
    --output text)

  aws --endpoint-url=http://localhost:4566 kms create-alias \
    --alias-name alias/components-core-JARRSAEncryptionKey \
    --target-key-id "$KEY_ID"

  echo "Finished creating KMS keys"
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
  aws --endpoint-url=http://localhost:4566 kms list-keys
  aws --endpoint-url=http://localhost:4566 kms list-aliases
  return 0
}

generate_keys
install_dependencies
configure_cli_for_localstack
start_localstack
create_ssm_parameters
create_kms_keys
create_dynamodb_tables
list_resources

echo "Localstack provisioned successfully"