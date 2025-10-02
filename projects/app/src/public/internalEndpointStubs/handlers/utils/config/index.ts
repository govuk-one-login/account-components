import type { FastifyRequest } from "fastify";

export const generateInternalEndpointStubConfigCookieKey = (
  group: string,
  endpoint: string,
) => {
  return `internalEndpointStub_${group}_${endpoint}`;
};

export const internalEndpointStubsConfig = {
  accountManagementApi: {
    exampleEndpoint: ["scenario1", "scenario2", "scenario3"],
  },
} as const;

export const getCurrentInternalEndpointStubScenario = (
  request: FastifyRequest,
  group: keyof typeof internalEndpointStubsConfig,
  endpoint: keyof (typeof internalEndpointStubsConfig)[keyof typeof internalEndpointStubsConfig],
) => {
  const config = internalEndpointStubsConfig[group][endpoint];

  return (
    config.find((scenario) => {
      return (
        scenario ===
        request.cookies[
          generateInternalEndpointStubConfigCookieKey(group, endpoint)
        ]
      );
    }) ?? config[0]
  );
};
