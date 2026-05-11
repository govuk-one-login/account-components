#!/bin/bash

set -e

export AWS_PAGER=""

FLOCI_ENDPOINT="http://localhost:4566"
KMS_ENDPOINT="http://localhost:4567"

generate_keys() {
  echo "Starting to generate keys"

  MOCK_CLIENT_EC_PRIVATE_KEY=$(openssl ecparam -name prime256v1 -genkey | openssl pkcs8 -topk8 -nocrypt -outform PEM)
  MOCK_CLIENT_EC_PUBLIC_KEY=$(echo "$MOCK_CLIENT_EC_PRIVATE_KEY" | openssl ec -pubout)
  MOCK_CLIENT_RSA_PRIVATE_KEY=$(openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -outform PEM)
  MOCK_CLIENT_RSA_PUBLIC_KEY=$(echo "$MOCK_CLIENT_RSA_PRIVATE_KEY" | openssl rsa -pubout)

  echo "Finished generating keys"
  return 0
}

configure_cli() {
  echo "Starting to configure AWS CLI"

  aws configure set aws_access_key_id test
  aws configure set aws_secret_access_key test
  aws configure set region eu-west-2

  echo "Finished configuring AWS CLI"
  return 0
}

create_docker_network() {
  echo "Creating Docker network"

  docker network create account-components-network || true

  echo "Docker network created"
  return 0
}

start_floci() {
  echo "Starting Floci"

  docker stop account-components-floci || true && docker rm account-components-floci || true
  docker run -d \
    -p 4566:4566 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e FLOCI_DEFAULT_REGION=eu-west-2 \
    -u root \
    --network account-components-network \
    --name account-components-floci \
    floci/floci:latest

  until aws --endpoint-url="$FLOCI_ENDPOINT" s3 ls > /dev/null 2>&1; do
    echo "⌛ Floci not ready yet, retrying in 2s"
    sleep 2
  done

  echo "Floci is ready"
  return 0
}

start_kms_local() {
  echo "Starting KMS Local"

  docker stop account-components-local-kms || true && docker rm account-components-local-kms || true
  docker run -d -p 4567:8080 --network account-components-network --name account-components-local-kms nsmithuk/local-kms

  until aws --endpoint-url="$KMS_ENDPOINT" kms list-keys > /dev/null 2>&1; do
    echo "⌛ KMS Local not ready yet, retrying in 2s"
    sleep 2
  done

  echo "KMS Local is ready"
  return 0
}

create_ssm_parameters() {
  echo "Creating SSM parameters"

  STRING="String"

  aws --endpoint-url="$FLOCI_ENDPOINT" ssm put-parameter \
    --name "/amc/MockClientEcPrivateKey" \
    --value "${MOCK_CLIENT_EC_PRIVATE_KEY}" \
    --type "${STRING}"

  aws --endpoint-url="$FLOCI_ENDPOINT" ssm put-parameter \
    --name "/amc/MockClientEcPublicKey" \
    --value "${MOCK_CLIENT_EC_PUBLIC_KEY}" \
    --type "${STRING}"

  aws --endpoint-url="$FLOCI_ENDPOINT" ssm put-parameter \
    --name "/amc/MockClientRsaPrivateKey" \
    --value "${MOCK_CLIENT_RSA_PRIVATE_KEY}" \
    --type "${STRING}"

  aws --endpoint-url="$FLOCI_ENDPOINT" ssm put-parameter \
    --name "/amc/MockClientRsaPublicKey" \
    --value "${MOCK_CLIENT_RSA_PUBLIC_KEY}" \
    --type "${STRING}"

  echo "Finished creating SSM parameters"
  return 0
}

create_kms_keys() {
  echo "Creating KMS keys"

  KEY_ID=$(aws --endpoint-url="$KMS_ENDPOINT" kms create-key \
    --key-spec RSA_2048 \
    --key-usage ENCRYPT_DECRYPT \
    --origin AWS_KMS \
    --query 'KeyMetadata.KeyId' \
    --output text)

  aws --endpoint-url="$KMS_ENDPOINT" kms create-alias \
    --alias-name alias/amc-JARRSAEncryptionKey \
    --target-key-id "$KEY_ID"

  JWT_SIGNING_KEY_ID=$(aws --endpoint-url="$KMS_ENDPOINT" kms create-key \
    --key-spec ECC_NIST_P256 \
    --key-usage SIGN_VERIFY \
    --origin AWS_KMS \
    --description "JWT Signing Key" \
    --query 'KeyMetadata.KeyId' \
    --output text)

  aws --endpoint-url="$KMS_ENDPOINT" kms create-alias \
    --alias-name alias/amc-JWTSigningKey \
    --target-key-id "$JWT_SIGNING_KEY_ID"

  echo "Finished creating KMS keys"
  return 0
}

create_dynamodb_tables() {
  echo "Creating DynamoDB tables"

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb create-table \
    --table-name "amc-JourneyOutcome" \
    --attribute-definitions \
      AttributeName=outcome_id,AttributeType=S \
    --key-schema \
      AttributeName=outcome_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb update-time-to-live \
    --table-name "amc-JourneyOutcome" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb create-table \
    --table-name "amc-SessionStore" \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
    --key-schema \
      AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb update-time-to-live \
    --table-name "amc-SessionStore" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb create-table \
    --table-name "amc-AuthCode" \
    --attribute-definitions \
      AttributeName=code,AttributeType=S \
    --key-schema \
      AttributeName=code,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb update-time-to-live \
    --table-name "amc-AuthCode" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb create-table \
    --table-name "amc-ReplayAttack" \
    --attribute-definitions \
      AttributeName=nonce,AttributeType=S \
    --key-schema \
      AttributeName=nonce,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb update-time-to-live \
    --table-name "amc-ReplayAttack" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  echo "Finished creating DynamoDB tables"
  return 0
}

create_sqs_queues() {
  echo "Creating SQS queues"

  aws --endpoint-url="$FLOCI_ENDPOINT" sqs create-queue \
    --queue-name "amc-NotificationsQueue"

  aws --endpoint-url="$FLOCI_ENDPOINT" sqs create-queue \
    --queue-name "amc-TxMASQSProducerAuditEventQueue"

  echo "Finished creating SQS queues"
  return 0
}

list_resources() {
  echo "List resources"

  PARAM_NAMES=$(aws ssm describe-parameters \
    --endpoint-url "$FLOCI_ENDPOINT" \
    --query "Parameters[*].Name" \
    --output text)

  echo "Listing SSM parameters..."

  for NAME in $PARAM_NAMES; do
    VALUE=$(aws ssm get-parameter \
      --endpoint-url "$FLOCI_ENDPOINT" \
      --name "$NAME" \
      --with-decryption \
      --query "Parameter.Value" \
      --output text)

    echo "$NAME = $VALUE"
  done

  aws --endpoint-url="$FLOCI_ENDPOINT" dynamodb list-tables
  aws --endpoint-url="$KMS_ENDPOINT" kms list-keys
  aws --endpoint-url="$KMS_ENDPOINT" kms list-aliases
  aws --endpoint-url="$FLOCI_ENDPOINT" sqs list-queues

  return 0
}

generate_keys
configure_cli
create_docker_network
start_floci
start_kms_local
create_ssm_parameters
create_kms_keys
create_dynamodb_tables
create_sqs_queues
list_resources

echo "Floci provisioned successfully"
