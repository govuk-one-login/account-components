import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getQueryParams } from "./utils/getQueryParams.js";
import { ErrorResponse } from "./utils/common.js";
import { getClient } from "./utils/getClient.js";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const queryParams = getQueryParams(event);
  if (queryParams instanceof ErrorResponse) {
    return queryParams.errorResponse;
  }

  const client = await getClient(
    queryParams.client_id,
    queryParams.redirect_uri,
  );
  if (client instanceof ErrorResponse) {
    return client.errorResponse;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Authorized" }),
  };
};
