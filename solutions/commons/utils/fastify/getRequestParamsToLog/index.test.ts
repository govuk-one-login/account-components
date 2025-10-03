import { expect, it, describe, vi, afterEach } from "vitest";
import { getRequestParamsToLog } from "./index.js";
import type { FastifyRequest } from "fastify";
import { getDiSessionIdsFromRequest } from "../getDiSessionIdsFromRequest/index.js";

vi.mock("../getDiSessionIdsFromRequest/index.js", () => ({
  getDiSessionIdsFromRequest: vi.fn(() => "fakeDiSessionIds"),
}));

describe("getRequestParamsToLog", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns as expected when request is undefined", () => {
    expect(getRequestParamsToLog()).toStrictEqual({
      awsRequestId: "",
      method: "",
      url: "",
      referrer: "",
      diSessionIds: "fakeDiSessionIds",
    });
    expect(getDiSessionIdsFromRequest).toHaveBeenCalledExactlyOnceWith(
      undefined,
    );
  });

  it("returns as expected when request is defined", () => {
    const request = {
      awsLambda: {
        context: {
          awsRequestId: "fakeAwsRequestId",
        },
      },
      method: "POST",
      url: "https://www.fake.com",
      headers: {
        referer: "https://www.fake.com/referrer",
      },
    };

    expect(getRequestParamsToLog(request as FastifyRequest)).toStrictEqual({
      awsRequestId: "fakeAwsRequestId",
      method: "POST",
      url: "https://www.fake.com",
      referrer: "https://www.fake.com/referrer",
      diSessionIds: "fakeDiSessionIds",
    });
    expect(getDiSessionIdsFromRequest).toHaveBeenCalledExactlyOnceWith(request);
  });
});
