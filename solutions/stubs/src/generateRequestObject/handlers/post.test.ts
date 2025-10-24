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

describe("generateRequestObjectPost", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      body: { test: "data" },
    };

    mockReply = {
      send: vi.fn().mockReturnThis(),
    };
  });

  it("should process request and return encrypted jar", async () => {
    const mockAccessToken = "mock-access-token";
    const mockScenario = "mock-scenario";
    const mockJwtToken = "mock-jwt-token";
    const mockEncryptedJar = "mock-encrypted-jar";

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

    await generateRequestObjectPost(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(generateAccessToken).toHaveBeenCalledTimes(2);
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
  });
});
