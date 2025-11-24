import type { SessionStore } from "@fastify/session";
import type { Session } from "fastify";
import { getDynamoDbClient } from "../../../commons/utils/awsClient/dynamodbClient/index.js";

const dynamoDbClient = getDynamoDbClient();

export class DynamoDbSessionStore implements SessionStore {
  public readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  set(
    sessionId: string,
    session: Session,
    callback: (err: unknown) => void,
  ): void {
    const defaultSessionLength = Math.floor(Date.now() / 1000) + 300; // 5 minutes

    dynamoDbClient
      .update({
        TableName: this.tableName,
        Key: { id: sessionId },
        UpdateExpression: "SET #session = :session, #expires = :expires",
        ExpressionAttributeNames: {
          "#session": "session",
          "#expires": "expires",
        },
        ExpressionAttributeValues: {
          ":session": JSON.stringify(session),
          ":expires": session.expires ?? defaultSessionLength,
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
    sessionId: string,
    callback: (err: unknown, session: Session | null) => void,
  ): void {
    dynamoDbClient
      .get({
        TableName: this.tableName,
        Key: {
          id: sessionId,
        },
        ConsistentRead: true,
      })
      .then((session) => {
        if (!session.Item) {
          callback(null, null);
          return;
        }
        if (session.Item["expires"] < Date.now() / 1000) {
          this.destroy(sessionId, (error) => {
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

  destroy(sessionId: string, callback: (err: unknown) => void): void {
    dynamoDbClient
      .delete({
        TableName: this.tableName,
        Key: {
          id: sessionId,
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
