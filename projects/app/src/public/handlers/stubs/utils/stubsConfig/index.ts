import type { FastifyRequest } from "fastify";

export const generateStubConfigCookieKey = (
  group: string,
  endpoint: string,
) => {
  return `stub_${group}_${endpoint}`;
};

export const stubsConfig = {
  accountManagementApi: {
    exampleEndpoint: ["scenario1", "scenario2", "scenario3"],
  },
} as const;

export const getCurrentStubScenario = (
  request: FastifyRequest,
  group: keyof typeof stubsConfig,
  endpoint: keyof (typeof stubsConfig)[keyof typeof stubsConfig],
) => {
  const config = stubsConfig[group][endpoint];

  return (
    config.find((scenario) => {
      return (
        scenario ===
        request.cookies[generateStubConfigCookieKey(group, endpoint)]
      );
    }) ?? config[0]
  );
};
