#!/bin/bash

set -e

export AWS_PAGER=""
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test" # pragma: allowlist secret
export AWS_DEFAULT_REGION="eu-west-2"

EMULATOR_ENDPOINT="https://localhost:9297"

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


create_ssm_parameters() {
  echo "Creating SSM parameters"

  STRING="String"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
    --name "/amc/MockClientEcPrivateKey" \
    --value "${MOCK_CLIENT_EC_PRIVATE_KEY}" \
    --type "${STRING}" &

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
    --name "/amc/MockClientEcPublicKey" \
    --value "${MOCK_CLIENT_EC_PUBLIC_KEY}" \
    --type "${STRING}" &

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
    --name "/amc/MockClientRsaPrivateKey" \
    --value "${MOCK_CLIENT_RSA_PRIVATE_KEY}" \
    --type "${STRING}" &

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl ssm put-parameter \
    --name "/amc/MockClientRsaPublicKey" \
    --value "${MOCK_CLIENT_RSA_PUBLIC_KEY}" \
    --type "${STRING}" &

  wait
  echo "Finished creating SSM parameters"
  return 0
}

create_kms_keys() {
  echo "Creating KMS keys"

  local key_id_file jwt_key_id_file
  key_id_file=$(mktemp)
  jwt_key_id_file=$(mktemp)

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl kms create-key \
    --key-spec RSA_2048 \
    --key-usage ENCRYPT_DECRYPT \
    --origin AWS_KMS \
    --query 'KeyMetadata.KeyId' \
    --output text > "$key_id_file" &

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl kms create-key \
    --key-spec ECC_NIST_P256 \
    --key-usage SIGN_VERIFY \
    --origin AWS_KMS \
    --description "JWT Signing Key" \
    --query 'KeyMetadata.KeyId' \
    --output text > "$jwt_key_id_file" &

  wait

  KEY_ID=$(cat "$key_id_file")
  JWT_SIGNING_KEY_ID=$(cat "$jwt_key_id_file")
  rm "$key_id_file" "$jwt_key_id_file"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl kms create-alias \
    --alias-name alias/amc-JARRSAEncryptionKey \
    --target-key-id "$KEY_ID" &

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl kms create-alias \
    --alias-name alias/amc-JWTSigningKey \
    --target-key-id "$JWT_SIGNING_KEY_ID" &

  wait
  echo "Finished creating KMS keys"
  return 0
}

create_dynamodb_table() {
  local table_name="$1"
  local attribute_definitions="$2"
  local key_schema="$3"
  local gsi="$4"
  local ttl_attr="$5"

  local args=(
    --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb create-table
    --table-name "$table_name"
    --attribute-definitions $attribute_definitions
    --key-schema $key_schema
    --billing-mode PAY_PER_REQUEST
  )
  [ -n "$gsi" ] && args+=(--global-secondary-indexes "$gsi")

  aws "${args[@]}"
  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb wait table-exists --table-name "$table_name"
  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl dynamodb update-time-to-live \
    --table-name "$table_name" \
    --time-to-live-specification "Enabled=true,AttributeName=$ttl_attr"
}

create_dynamodb_tables() {
  echo "Creating DynamoDB tables"

  create_dynamodb_table "amc-JourneyOutcome" \
    "AttributeName=outcome_id,AttributeType=S" \
    "AttributeName=outcome_id,KeyType=HASH" \
    "" "expires" &

  create_dynamodb_table "amc-SessionStore" \
    "AttributeName=id,AttributeType=S" \
    "AttributeName=id,KeyType=HASH" \
    "" "expires" &

  create_dynamodb_table "amc-AuthCode" \
    "AttributeName=code,AttributeType=S" \
    "AttributeName=code,KeyType=HASH" \
    "" "expires" &

  create_dynamodb_table "amc-ReplayAttack" \
    "AttributeName=nonce,AttributeType=S" \
    "AttributeName=nonce,KeyType=HASH" \
    "" "expires" &

  create_dynamodb_table "amc-Lockouts" \
    "AttributeName=id,AttributeType=S AttributeName=publicSubjectId,AttributeType=S AttributeName=lockedOutAt,AttributeType=N" \
    "AttributeName=id,KeyType=HASH" \
    '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"lockedOutAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    "keepUntil" &

  create_dynamodb_table "amc-OTPs" \
    "AttributeName=id,AttributeType=S AttributeName=publicSubjectId,AttributeType=S AttributeName=createdAt,AttributeType=N" \
    "AttributeName=id,KeyType=HASH" \
    '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    "keepUntil" &

  create_dynamodb_table "amc-OTP-Checks" \
    "AttributeName=id,AttributeType=S AttributeName=publicSubjectId,AttributeType=S AttributeName=createdAt,AttributeType=N" \
    "AttributeName=id,KeyType=HASH" \
    '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    "keepUntil" &

  create_dynamodb_table "amc-Password-Checks" \
    "AttributeName=id,AttributeType=S AttributeName=publicSubjectId,AttributeType=S AttributeName=createdAt,AttributeType=N" \
    "AttributeName=id,KeyType=HASH" \
    '[{"IndexName":"PublicSubjectId_Index","KeySchema":[{"AttributeName":"publicSubjectId","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    "keepUntil" &

  wait
  echo "Finished creating DynamoDB tables"
  return 0
}

create_sqs_queues() {
  echo "Creating SQS queues"

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl sqs create-queue \
    --queue-name "amc-NotificationsQueue" &

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl sqs create-queue \
    --queue-name "amc-TxMASQSProducerAuditEventQueue" &

  wait
  echo "Finished creating SQS queues"
  return 0
}

create_app_config() {
  echo "Creating AppConfig resources"

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  LOCAL_CONFIG="$SCRIPT_DIR/../config/local-config.json"

  APP_ID=$(aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl appconfig create-application \
    --name "account-components" \
    --query 'Id' \
    --output text)

  ENV_ID=$(aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl appconfig create-environment \
    --application-id "$APP_ID" \
    --name "local" \
    --query 'Id' \
    --output text)

  PROFILE_ID=$(aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl appconfig create-configuration-profile \
    --application-id "$APP_ID" \
    --name "operational" \
    --location-uri "hosted" \
    --query 'Id' \
    --output text)

  VERSION=$(aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl appconfig create-hosted-configuration-version \
    --application-id "$APP_ID" \
    --configuration-profile-id "$PROFILE_ID" \
    --content-type "application/json" \
    --content "fileb://$LOCAL_CONFIG" \
    --query 'VersionNumber' \
    --output text \
    /dev/null)

  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl appconfig start-deployment \
    --application-id "$APP_ID" \
    --environment-id "$ENV_ID" \
    --configuration-profile-id "$PROFILE_ID" \
    --configuration-version "$VERSION" \
    --deployment-strategy-id "AppConfig.AllAtOnce"

  echo "Finished creating AppConfig resources"
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
  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl kms list-keys
  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl kms list-aliases
  aws --endpoint-url="$EMULATOR_ENDPOINT" --no-verify-ssl sqs list-queues

  return 0
}

generate_keys
create_docker_network
build_images
start_aws_emulator
create_ssm_parameters &
create_kms_keys &
create_dynamodb_tables &
create_sqs_queues &
create_app_config &
wait
list_resources

echo "Local AWS provisioned successfully"
