import type { SessionStore } from "@fastify/session";
import type { Session } from "fastify";
import { getDynamoDbClient } from "../../../commons/utils/awsClient/dynamodbClient/index.js";

const hasKey = <K extends string>(
  value: unknown,
  key: K,
): value is Record<K, unknown> =>
  typeof value === "object" && value !== null && key in value;

const getGeneration = (session: Session, sessionStoreId: string): string => {
  const metadata = hasKey(session, "__fastifySessionMetadata")
    ? session.__fastifySessionMetadata
    : undefined;
  const generation = hasKey(metadata, "generation")
    ? metadata.generation
    : undefined;
  return typeof generation === "string" ? generation : sessionStoreId;
};

const dynamoDbClient = getDynamoDbClient();

export class DynamoDbSessionStore implements SessionStore {
  public readonly tableName: string;
  public readonly defaultSessionLength: number;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.defaultSessionLength = Math.floor(Date.now() / 1000) + 300;
  }

  set(
    sessionStoreId: string,
    session: Session,
    callback: (err: unknown) => void,
  ): void {
    dynamoDbClient
      .update({
        TableName: this.tableName,
        Key: { id: sessionStoreId },
        UpdateExpression:
          "SET #session = :session, #expires = :expires, #generation = :generation",
        ExpressionAttributeNames: {
          "#session": "session",
          "#expires": "expires",
          "#generation": "__fastifySessionMetadataGeneration",
        },
        ExpressionAttributeValues: {
          ":session": JSON.stringify(session),
          ":expires": session.expires ?? this.defaultSessionLength,
          ":generation": getGeneration(session, sessionStoreId),
        },
      })
      .then(() => {
        callback(null);
      })
      .catch((error: unknown) => {
        callback(error);
      });
  }

  get(
    sessionStoreId: string,
    callback: (err: unknown, session: Session | null) => void,
  ): void {
    dynamoDbClient
      .get({
        TableName: this.tableName,
        Key: {
          id: sessionStoreId,
        },
        ConsistentRead: true,
      })
      .then((session) => {
        if (!session.Item) {
          callback(null, null);
          return;
        }
        if (session.Item["expires"] < Math.floor(Date.now() / 1000)) {
          this.destroy(sessionStoreId, (error) => {
            callback(error, null);
          });
          return;
        }

        callback(
          null,
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          JSON.parse(session.Item["session"] as string) as Session,
        );
      })
      .catch((error: unknown) => {
        callback(error, null);
      });
  }

  compareAndSet(
    sessionStoreId: string,
    expectedGeneration: string,
    session: Session,
    callback: (err: unknown) => void,
  ): void {
    dynamoDbClient
      .update({
        TableName: this.tableName,
        Key: { id: sessionStoreId },
        UpdateExpression:
          "SET #session = :session, #expires = :expires, #generation = :newGeneration",
        ConditionExpression:
          "attribute_exists(#id) AND #generation = :expectedGeneration",
        ExpressionAttributeNames: {
          "#id": "id",
          "#session": "session",
          "#expires": "expires",
          "#generation": "__fastifySessionMetadataGeneration",
        },
        ExpressionAttributeValues: {
          ":session": JSON.stringify(session),
          ":expires": session.expires ?? this.defaultSessionLength,
          ":expectedGeneration": expectedGeneration,
          ":newGeneration": getGeneration(session, sessionStoreId),
        },
      })
      .then(() => {
        callback(null);
      })
      .catch((error: unknown) => {
        if (
          error instanceof Error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          const enoent = new Error("The session does not exist or has changed");
          Object.assign(enoent, { code: "ENOENT" });
          callback(enoent);
          return;
        }
        callback(error);
      });
  }

  destroy(sessionStoreId: string, callback: (err: unknown) => void): void {
    dynamoDbClient
      .delete({
        TableName: this.tableName,
        Key: {
          id: sessionStoreId,
        },
      })
      .then(() => {
        callback(null);
      })
      .catch((error: unknown) => {
        callback(error);
      });
  }
}
