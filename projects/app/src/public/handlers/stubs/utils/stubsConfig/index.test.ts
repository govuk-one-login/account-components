import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import {
  generateStubConfigCookieKey,
  getCurrentStubScenario,
} from "./index.js";

describe("generateStubConfigCookieKey", () => {
  it("should generate correct cookie key format", () => {
    expect(generateStubConfigCookieKey("group", "endpoint")).toBe(
      "stub_group_endpoint",
    );
  });
});

describe("getCurrentStubScenario", () => {
  it("should return scenario from cookie when it exists in config", () => {
    const request = {
      cookies: {
        stub_accountManagementApi_exampleEndpoint: "scenario2",
      },
    } as Partial<FastifyRequest>;

    expect(
      getCurrentStubScenario(
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
      getCurrentStubScenario(
        request,
        "accountManagementApi",
        "exampleEndpoint",
      ),
    ).toBe("scenario1");
  });

  it("should return first scenario when cookie value is not in config", () => {
    const request = {
      cookies: {
        stub_accountManagementApi_exampleEndpoint: "invalidScenario",
      },
    } as Partial<FastifyRequest>;

    expect(
      getCurrentStubScenario(
        request as FastifyRequest,
        "accountManagementApi",
        "exampleEndpoint",
      ),
    ).toBe("scenario1");
  });
});
