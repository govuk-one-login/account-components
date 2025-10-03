import { expect, it, describe, vi, beforeEach } from "vitest";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import Fastify from "fastify";
import { internalEndpointStubs } from "./index.js";
import * as tokenGenerator from "../../stubs/tokenGenerator/index.js";
import * as accessTokenUtils from "../../stubs/utils/access-token.js";
import * as jarBuilder from "../../stubs/buildJar/index.js";
import * as scenarioUtils from "../../stubs/tokenGenerator/index.js";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { MockRequestObjectScenarios } from "../../stubs/types/common.js";

vi.mock("./handlers/utils/config/index.js");

vi.mock("../../stubs/utils/logger", () => ({
  default: {
    info: vi.fn(),
  },
}));

vi.mock("../../stubs/utils/access-token", () => ({
  generateAccessToken: vi.fn(),
}));

vi.mock("../../stubs/tokenGenerator", async () => {
  const actual = await import("../../stubs/tokenGenerator/index.js");
  return {
    ...actual,
    getScenario: vi.fn(),
    generateJwtToken: vi.fn(),
  };
});

vi.mock("../../stubs/buildJar", () => ({
  buildJar: vi.fn(),
}));

vi.mock("./handlers/utils/paths", () => ({
  getPath: vi
    .fn()
    .mockReturnValue("/stubs/internal-endpoints/generate-request-object"),
}));

describe("internalEndpointStubs plugin", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify().withTypeProvider<TypeBoxTypeProvider>();
    app.register(internalEndpointStubs);

    await app.ready();

    vi.mocked(accessTokenUtils.generateAccessToken).mockResolvedValue(
      "mock-access-token",
    );
    vi.mocked(scenarioUtils.getScenario).mockReturnValue(
      "valid" as MockRequestObjectScenarios,
    );
    vi.mocked(tokenGenerator.generateJwtToken).mockResolvedValue(
      "mock-jwt-token",
    );
    vi.mocked(jarBuilder.buildJar).mockResolvedValue("mock-encrypted-jar");
  });

  it("registers requestObjectGenerator POST route", async () => {
    const response: LightMyRequestResponse = await app.inject({
      method: "POST",
      url: "/stubs/internal-endpoints/generate-request-object",
      payload: {
        someKey: "someValue",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("mock-encrypted-jar");

    expect(accessTokenUtils.generateAccessToken).toHaveBeenCalledWith({
      access_token: "mock-access-token",
      someKey: "someValue",
    });
    expect(tokenGenerator.generateJwtToken).toHaveBeenCalledWith(
      {
        access_token: "mock-access-token",
        someKey: "someValue",
      },
      "valid",
    );
    expect(jarBuilder.buildJar).toHaveBeenCalledWith("mock-jwt-token");
  });
});
