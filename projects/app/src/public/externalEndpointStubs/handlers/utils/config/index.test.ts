import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  generateExternalEndpointStubConfigCookieKey,
  getCurrentExternalEndpointStubScenario,
} from "./index.js";

describe("generateExternalEndpointStubConfigCookieKey", () => {
  it("should generate correct cookie key format", () => {
    expect(
      generateExternalEndpointStubConfigCookieKey("group", "endpoint"),
    ).toBe("externalEndpointStub_group_endpoint");
  });
});

describe("getCurrentExternalEndpointStubScenario", () => {
  it("should return scenario from cookie when it exists in config", () => {
    const request = {
      cookies: {
        externalEndpointStub_accountManagementApi_exampleEndpoint: "scenario2",
      },
    } as Partial<FastifyRequest>;

    expect(
      getCurrentExternalEndpointStubScenario(
        request as FastifyRequest,
        "accountManagementApi",
        "exampleEndpoint",
      ),
    ).toBe("scenario2");
  });

  it("should return first scenario when cookie does not exist", () => {
    const request = {
      cookies: {},
    } as FastifyRequest;

    expect(
      getCurrentExternalEndpointStubScenario(
        request,
        "accountManagementApi",
        "exampleEndpoint",
      ),
    ).toBe("scenario1");
  });

  it("should return first scenario when cookie value is not in config", () => {
    const request = {
      cookies: {
        externalEndpointStub_accountManagementApi_exampleEndpoint:
          "invalidScenario",
      },
    } as Partial<FastifyRequest>;

    expect(
      getCurrentExternalEndpointStubScenario(
        request as FastifyRequest,
        "accountManagementApi",
        "exampleEndpoint",
      ),
    ).toBe("scenario1");
  });
});
