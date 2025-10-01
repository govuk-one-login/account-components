import { expect, it, describe, vi, afterEach } from "vitest";
import { logRequest } from "./index.js";
import type { FastifyRequest } from "fastify";
import { getRequestParamsToLog } from "../getRequestParamsToLog/index.js";

vi.mock("../getRequestParamsToLog/index.js", () => ({
  getRequestParamsToLog: vi.fn(() => "fakeRequestParams"),
}));

describe("logRequest", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs request with correct parameters", async () => {
    const log = {
      info: vi.fn(),
    };
    const request = {
      log,
    } as unknown as FastifyRequest;

    await logRequest(request);

    expect(getRequestParamsToLog).toHaveBeenCalledExactlyOnceWith(request);
    expect(log.info).toHaveBeenCalledExactlyOnceWith(
      {
        request: "fakeRequestParams",
      },
      "received request",
    );
  });
});
