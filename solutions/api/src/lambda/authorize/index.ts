import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getQueryParams } from "./utils/getQueryParams.js";
import { ErrorResponse } from "./utils/common.js";
import { getClient } from "./utils/getClient.js";
import { decryptJar } from "./utils/decryptJar.js";
import { verifyJwt } from "./utils/verifyJwt.js";

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

  const signedJwt = await decryptJar(
    queryParams.request,
    queryParams.client_id,
    queryParams.redirect_uri,
    queryParams.state,
  );
  if (signedJwt instanceof ErrorResponse) {
    return signedJwt.errorResponse;
  }

  const claims = await verifyJwt(
    signedJwt,
    client,
    queryParams.redirect_uri,
    queryParams.state,
  );
  if (claims instanceof ErrorResponse) {
    return claims.errorResponse;
  }

  // TODO used for debugging. Remove before going live!
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Authorized", signedJwt }, null, 2),
  };
};
