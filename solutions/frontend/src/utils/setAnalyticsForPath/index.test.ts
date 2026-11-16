import { beforeEach, describe, expect, it } from "vitest";
import { setAnalyticsForPath } from "./index.js";
import type { FastifyRequest, FastifyReply } from "fastify";

describe("setAnalyticsForPath", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {};
  });

  it("should set analytics on reply when path has analytics defined", async () => {
    const request = { url: "/set-up-passkey" };

    await setAnalyticsForPath(request as FastifyRequest, reply as FastifyReply);

    expect(reply.analytics).toStrictEqual({
      taxonomyLevel1: "accounts",
      taxonomyLevel2: "manage",
      taxonomyLevel3: "passkey",
    });
  });

  it("should not set analytics on reply when path has no analytics defined", async () => {
    const request = { url: "/testing-journey/step-1" };

    await setAnalyticsForPath(request as FastifyRequest, reply as FastifyReply);

    expect(reply.analytics).toBeUndefined();
  });

  it("should not set analytics on reply when path does not match any known path", async () => {
    const request = { url: "/unknown-path" };

    await setAnalyticsForPath(request as FastifyRequest, reply as FastifyReply);

    expect(reply.analytics).toBeUndefined();
  });

  it("should match path ignoring query parameters", async () => {
    const request = { url: "/set-up-passkey?foo=bar" };

    await setAnalyticsForPath(request as FastifyRequest, reply as FastifyReply);

    expect(reply.analytics).toStrictEqual({
      taxonomyLevel1: "accounts",
      taxonomyLevel2: "manage",
      taxonomyLevel3: "passkey",
    });
  });

  it("should set analytics for paths defined in paths.others", async () => {
    const request = { url: "/error" };

    await setAnalyticsForPath(request as FastifyRequest, reply as FastifyReply);

    expect(reply.analytics).toStrictEqual({
      taxonomyLevel1: "accounts",
      contentId: "a1a3dddd-9e65-40dc-9256-12ed597ec40e",
    });
  });
});
