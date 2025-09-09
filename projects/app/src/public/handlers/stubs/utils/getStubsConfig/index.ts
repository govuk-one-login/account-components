import type { FastifyRequest } from "fastify";

export const stubsConfig = {
  accountManagementApi: {
    exampleEndpoint: {
      cookieKey: "stub_accountManagementApi_exampleEndpoint",
      scenarios: ["scenario1", "scenario2", "scenario3"],
    },
  },
} as const;

export const getCurrentStubScenario = (
  request: FastifyRequest,
  group: keyof typeof stubsConfig,
  endpoint: keyof (typeof stubsConfig)[keyof typeof stubsConfig],
) => {
  const config = stubsConfig[group][endpoint];

  return (
    config.scenarios.find((scenario) => {
      return scenario === request.cookies[config.cookieKey];
    }) ?? config.scenarios[0]
  );
};
