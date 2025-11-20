import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { generateRequestObjectPost } from "./post.js";
import { generateAccessToken } from "../../utils/access-token.js";
import { buildJar } from "../utils/buildJar/index.js";
import {
  generateJwtToken,
  getScenario,
} from "../utils/tokenGenerator/index.js";
import type { MockRequestObjectScenarios } from "../../types/common.js";
import { Algorithms } from "../../types/common.js";

// Mock the dependencies
vi.mock(import("../../utils/access-token.js"), () => ({
  generateAccessToken: vi.fn(),
}));

vi.mock(import("../utils/buildJar/index.js"), () => ({
  buildJar: vi.fn(),
}));

vi.mock(import("../utils/tokenGenerator/index.js"), () => ({
  generateJwtToken: vi.fn(),
  getScenario: vi.fn(),
}));

function expectJarInResponse(
  mockRequest: Partial<FastifyRequest>,
  mockAccessToken: string,
  mockScenario: string,
  mockJwtToken: string,
  mockReply: Partial<FastifyReply>,
  mockEncryptedJar: string,
  generateAccessTokenCalledCount: number,
) {
  expect(generateAccessToken).toHaveBeenCalledTimes(
    generateAccessTokenCalledCount,
  );
  expect(getScenario).toHaveBeenCalledExactlyOnceWith({
    ...(mockRequest.body as object),
    access_token: mockAccessToken,
  });
  expect(generateJwtToken).toHaveBeenCalledExactlyOnceWith(
    { ...(mockRequest.body as object), access_token: mockAccessToken },
    mockScenario,
  );
  expect(buildJar).toHaveBeenCalledExactlyOnceWith(mockJwtToken);
  expect(mockReply.send).toHaveBeenCalledExactlyOnceWith({
    encryptedJar: mockEncryptedJar,
    jwtPayload: {},
    jwtHeader: { alg: Algorithms.EC },
  });
}

describe("generateRequestObjectPost should process request and return encrypted jar", () => {
  let mockReply: Partial<FastifyReply>;
  const mockAccessToken = "mock-access-token";
  const mockScenario = "mock-scenario";
  const mockJwtToken = "mock-jwt-token";
  const mockEncryptedJar = "mock-encrypted-jar";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateAccessToken).mockResolvedValue(mockAccessToken);
    vi.mocked(getScenario).mockReturnValue(
      mockScenario as MockRequestObjectScenarios,
    );
    vi.mocked(generateJwtToken).mockResolvedValue({
      token: mockJwtToken,
      jwtPayload: {},
      jwtHeader: { alg: Algorithms.EC },
    });
    vi.mocked(buildJar).mockResolvedValue(mockEncryptedJar);
    mockReply = {
      send: vi.fn().mockReturnThis(),
    };
  });

  // eslint-disable-next-line vitest/expect-expect
  it("with a refresh_token claim", async () => {
    const mockRequest: Partial<FastifyRequest> = {
      body: { test: "data", refresh_token: "true" },
    };

    await generateRequestObjectPost(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expectJarInResponse(
      mockRequest,
      mockAccessToken,
      mockScenario,
      mockJwtToken,
      mockReply,
      mockEncryptedJar,
      2,
    );
  });

  // eslint-disable-next-line vitest/expect-expect
  it("without a refresh_token claim", async () => {
    const mockRequest: Partial<FastifyRequest> = {
      body: { test: "data", refresh_token: "false" },
    };

    await generateRequestObjectPost(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expectJarInResponse(
      mockRequest,
      mockAccessToken,
      mockScenario,
      mockJwtToken,
      mockReply,
      mockEncryptedJar,
      1,
    );
  });
});
