import { EventEmitter } from "events";
import { getDynamoDbClient } from "../awsClient/index.js";
import type { FastifyRequest } from "fastify";
import type { FastifySessionObject } from "@fastify/session";
import type { PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

type SessionData = FastifyRequest["session"];

export class DynamoDbSessionStore extends EventEmitter {
  private client = getDynamoDbClient();
  private tableName: string;
  private specialKeys: (keyof FastifySessionObject)[];

  constructor(tableName: string, specialKeys?: (keyof FastifySessionObject)[]) {
    super();
    this.tableName = tableName;
    this.specialKeys = specialKeys ?? [];
  }

  private static getExpiry(session: SessionData): number {
    if (session.cookie.maxAge) {
      return Math.floor((Date.now() + session.cookie.maxAge) / 1000);
    }
    if (session.cookie.expires) {
      return Math.floor(session.cookie.expires.getTime() / 1000);
    }
    return Math.floor(Date.now() / 1000) + 300; // Default 5 minutes
  }

  get(
    sid: string,
    callback: (error: unknown, session?: SessionData | null) => void,
  ): void {
    this.client
      .get({
        TableName: this.tableName,
        Key: { id: sid },
      })
      .then((result) => {
        const session = result.Item?.data ?? null;
        callback(null, session);
      })
      .catch((error: unknown) => {
        // @ts-expect-error - TODO
        if (error.code === "ENOENT") {
          callback(null, null);
        } else {
          callback(error);
        }
      });
  }

  set(
    sid: string,
    session: SessionData,
    callback: (error?: unknown) => void,
  ): void {
    const item: PutCommandInput["Item"] = {
      id: sid,
      data: session,
      expires: DynamoDbSessionStore.getExpiry(session),
    };

    for (const specialKey of this.specialKeys) {
      if (session[specialKey] !== undefined) {
        item[specialKey] = session[specialKey];
      }
    }

    this.client
      .put({
        TableName: this.tableName,
        Item: item,
      })
      .then(() => {
        callback();
      })
      .catch(callback);
  }

  destroy(sid: string, callback: (error?: unknown) => void): void {
    this.client
      .delete({
        TableName: this.tableName,
        Key: { id: sid },
      })
      .then(() => {
        callback();
      })
      .catch(callback);
  }

  touch(
    sid: string,
    session: SessionData,
    callback: (error?: unknown) => void,
  ): void {
    this.client
      .update({
        TableName: this.tableName,
        Key: { id: sid },
        UpdateExpression: "SET expires = :expires",
        ExpressionAttributeValues: {
          ":expires": DynamoDbSessionStore.getExpiry(session),
        },
      })
      .then(() => {
        callback();
      })
      .catch(callback);
  }
}
