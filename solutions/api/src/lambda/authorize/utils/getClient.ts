import {
  metrics,
  logger,
} from "../../../../../commons/utils/observability/index.js";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { getClientRegistry } from "../../../../../commons/utils/getClientRegistry/index.js";
import { badRequestResponse, ErrorResponse } from "./common.js";

export const getClient = async (clientId: string, redirectUri: string) => {
  const clientRegistry = await getClientRegistry();
  const client = clientRegistry.find((client) => client.client_id === clientId);

  if (!client) {
    logger.warn("Client Not Found", {
      client_id: clientId,
    });
    metrics.addMetric("ClientNotFound", MetricUnit.Count, 1);
    return new ErrorResponse(badRequestResponse);
  }

  if (!client.redirect_uris.includes(redirectUri)) {
    logger.warn("Invalid redirect_uri", {
      client_id: clientId,
      received_redirect_uri: redirectUri,
      allowed_redirect_uris: client.redirect_uris,
    });
    metrics.addMetric("InvalidRedirectUri", MetricUnit.Count, 1);
    return new ErrorResponse(badRequestResponse);
  }

  return client;
};
