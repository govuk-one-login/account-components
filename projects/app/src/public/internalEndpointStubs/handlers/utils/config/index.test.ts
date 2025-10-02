import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  generateInternalEndpointStubConfigCookieKey,
  getCurrentInternalEndpointStubScenario,
} from "./index.js";

describe("generateInternalEndpointStubConfigCookieKey", () => {
  it("should generate correct cookie key format", () => {
    expect(
      generateInternalEndpointStubConfigCookieKey("group", "endpoint"),
    ).toBe("internalEndpointStub_group_endpoint");
  });
});

describe("getCurrentInternalEndpointStubScenario", () => {
  it("should return scenario from cookie when it exists in config", () => {
    const request = {
      cookies: {
        internalEndpointStub_accountManagementApi_exampleEndpoint: "scenario2",
      },
    } as Partial<FastifyRequest>;

    expect(
      getCurrentInternalEndpointStubScenario(
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
      getCurrentInternalEndpointStubScenario(
        request,
        "accountManagementApi",
        "exampleEndpoint",
      ),
    ).toBe("scenario1");
  });

  it("should return first scenario when cookie value is not in config", () => {
    const request = {
      cookies: {
        internalEndpointStub_accountManagementApi_exampleEndpoint:
          "invalidScenario",
      },
    } as Partial<FastifyRequest>;

    expect(
      getCurrentInternalEndpointStubScenario(
        request as FastifyRequest,
        "accountManagementApi",
        "exampleEndpoint",
      ),
    ).toBe("scenario1");
  });
});
