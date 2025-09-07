import { expect, it, describe, vi, afterEach } from "vitest";
import { logResponse } from "./index.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import { getRequestParamsToLog } from "../getRequestParamsToLog/index.js";

vi.mock("../getRequestParamsToLog/index.js", () => ({
  getRequestParamsToLog: vi.fn(() => "fakeRequestParams"),
}));

describe("logResponse", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("logs response with correct parameters", async () => {
    const log = {
      info: vi.fn(),
    };
    const request = {
      log,
    } as unknown as FastifyRequest;
    const reply = {
      statusCode: 200,
    } as unknown as FastifyReply;

    await logResponse(request, reply);

    expect(getRequestParamsToLog).toHaveBeenCalledExactlyOnceWith(request);
    expect(log.info).toHaveBeenCalledExactlyOnceWith(
      {
        request: "fakeRequestParams",
        response: {
          statusCode: 200,
        },
      },
      "sent response",
    );
  });
});
