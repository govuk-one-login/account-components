import type { FastifyRequest } from "fastify";

export const generateExternalEndpointStubConfigCookieKey = (
  group: string,
  endpoint: string,
) => {
  return `externalEndpointStub_${group}_${endpoint}`;
};

export const externalEndpointStubsConfig = {
  accountManagementApi: {
    exampleEndpoint: ["scenario1", "scenario2", "scenario3"],
  },
} as const;

export const getCurrentExternalEndpointStubScenario = (
  request: FastifyRequest,
  group: keyof typeof externalEndpointStubsConfig,
  endpoint: keyof (typeof externalEndpointStubsConfig)[keyof typeof externalEndpointStubsConfig],
) => {
  const config = externalEndpointStubsConfig[group][endpoint];

  return (
    config.find((scenario) => {
      return (
        scenario ===
        request.cookies[
          generateExternalEndpointStubConfigCookieKey(group, endpoint)
        ]
      );
    }) ?? config[0]
  );
};
