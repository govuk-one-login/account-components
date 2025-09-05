import { expect, it, describe } from "vitest";
import { getDiSessionIdsFromRequest } from "./index.js";
import type { FastifyRequest } from "fastify";

describe("getDiSessionIdsFromRequest", () => {
  it("returns as expected when request is undefined", () => {
    expect(getDiSessionIdsFromRequest()).toStrictEqual({
      persistentSessionId: "",
      sessionId: "",
      clientSessionId: "",
    });
  });

  it("returns as expected when request is defined and cookies are set", () => {
    expect(
      getDiSessionIdsFromRequest({
        cookies: {
          gs: "fakeSessionId.fakeClientSessionId",
          "di-persistent-session-id": "fakePersistentSessionId",
        } as FastifyRequest["cookies"],
      } as FastifyRequest),
    ).toStrictEqual({
      persistentSessionId: "fakePersistentSessionId",
      sessionId: "fakeSessionId",
      clientSessionId: "fakeClientSessionId",
    });
  });
});
