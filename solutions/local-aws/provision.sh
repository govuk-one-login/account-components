#!/bin/bash

set -e

export AWS_PAGER=""
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test" # pragma: allowlist secret
export AWS_DEFAULT_REGION="eu-west-2"

EMULATOR_ENDPOINT="https://localhost:9297"
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

create_docker_network() {
  echo "Creating Docker network"

  docker network create account-components-network || true

  echo "Docker network created"
  return 0
}

build_images() {
  echo "Building Docker images"

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  case "$(uname -m)" in
    arm64|aarch64) RPM_ARCH="aarch64" ;;
    *) RPM_ARCH="x86_64" ;;
  esac

  docker build -t account-components-aws-emulator --build-arg RPM_ARCH="$RPM_ARCH" -f "$SCRIPT_DIR/aws-emulator/Dockerfile" "$SCRIPT_DIR"
  docker build -t account-components-local-kms -f "$SCRIPT_DIR/local-kms/Dockerfile" "$SCRIPT_DIR"

  echo "Finished building Docker images"
  return 0
}

start_aws_emulator() {
  echo "Starting AWS Emulator"

  docker stop account-components-aws-emulator || true && docker rm account-components-aws-emulator || true
  docker run -d \
    -p 9297:9297 \
    --network account-components-network \
    --name account-components-aws-emulator \
    account-components-aws-emulator \
    --auth off

  until curl -sf --insecure "$EMULATOR_ENDPOINT/__admin/health" > /dev/null 2>&1; do
    echo "⌛ AWS Emulator not ready yet, retrying in 2s"
    sleep 2
  done

  echo "AWS Emulator is ready"
  return 0
}

# It is necessary to use a separate KMS solution rather than relying on AWS Emulator's.
# AWS Emulator's KMS solution does not work consistently across different machines.
start_kms_local() {
  echo "Starting KMS Local"

  docker stop account-components-local-kms || true && docker rm account-components-local-kms || true
  docker run -d -p 4567:8080 --network account-components-network --name account-components-local-kms account-components-local-kms

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

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
    --name "/amc/MockClientEcPrivateKey" \
    --value "${MOCK_CLIENT_EC_PRIVATE_KEY}" \
    --type "${STRING}"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
    --name "/amc/MockClientEcPublicKey" \
    --value "${MOCK_CLIENT_EC_PUBLIC_KEY}" \
    --type "${STRING}"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
    --name "/amc/MockClientRsaPrivateKey" \
    --value "${MOCK_CLIENT_RSA_PRIVATE_KEY}" \
    --type "${STRING}"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
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

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-JourneyOutcome" \
    --attribute-definitions \
      AttributeName=outcome_id,AttributeType=S \
    --key-schema \
      AttributeName=outcome_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb wait table-exists \
    --table-name "amc-JourneyOutcome"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb update-time-to-live \
    --table-name "amc-JourneyOutcome" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-SessionStore" \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
    --key-schema \
      AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb wait table-exists \
    --table-name "amc-SessionStore"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb update-time-to-live \
    --table-name "amc-SessionStore" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-AuthCode" \
    --attribute-definitions \
      AttributeName=code,AttributeType=S \
    --key-schema \
      AttributeName=code,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb wait table-exists \
    --table-name "amc-AuthCode"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb update-time-to-live \
    --table-name "amc-AuthCode" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-ReplayAttack" \
    --attribute-definitions \
      AttributeName=nonce,AttributeType=S \
    --key-schema \
      AttributeName=nonce,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb wait table-exists \
    --table-name "amc-ReplayAttack"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb update-time-to-live \
    --table-name "amc-ReplayAttack" \
    --time-to-live-specification "Enabled=true,AttributeName=expires"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-Lockouts" \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=publicSubjectId,AttributeType=S \
      AttributeName=lockedOutAt,AttributeType=N \
    --key-schema \
      AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
      '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"lockedOutAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-OTPs" \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=publicSubjectId,AttributeType=S \
      AttributeName=createdAt,AttributeType=N \
    --key-schema \
      AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
      '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-OTP-Checks" \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=publicSubjectId,AttributeType=S \
      AttributeName=createdAt,AttributeType=N \
    --key-schema \
      AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
      '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table \
    --table-name "amc-Password-Checks" \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=publicSubjectId,AttributeType=S \
      AttributeName=createdAt,AttributeType=N \
    --key-schema \
      AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
      '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST

  echo "Finished creating DynamoDB tables"
  return 0
}

create_sqs_queues() {
  echo "Creating SQS queues"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl sqs create-queue \
    --queue-name "amc-NotificationsQueue"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl sqs create-queue \
    --queue-name "amc-TxMASQSProducerAuditEventQueue"

  echo "Finished creating SQS queues"
  return 0
}

list_resources() {
  echo "List resources"

  PARAM_NAMES=$(aws ssm describe-parameters \
    --endpoint-url "$EMULATOR_ENDPOINT" --no-verify-ssl \
    --query "Parameters[*].Name" \
    --output text)

  echo "Listing SSM parameters..."

  for NAME in $PARAM_NAMES; do
    VALUE=$(aws ssm get-parameter \
      --endpoint-url "$EMULATOR_ENDPOINT" --no-verify-ssl \
      --name "$NAME" \
      --with-decryption \
      --query "Parameter.Value" \
      --output text)

    echo "$NAME = $VALUE"
  done

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb list-tables
  aws --endpoint-url="$KMS_ENDPOINT" kms list-keys
  aws --endpoint-url="$KMS_ENDPOINT" kms list-aliases
  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl sqs list-queues

  return 0
}

generate_keys
create_docker_network
build_images
start_aws_emulator
start_kms_local
create_ssm_parameters
create_kms_keys
create_dynamodb_tables
create_sqs_queues
list_resources

echo "Local AWS provisioned successfully"
