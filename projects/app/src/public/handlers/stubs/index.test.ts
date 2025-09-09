import { expect, it, describe, vi, beforeEach } from "vitest";
import type { FastifyReply } from "fastify";
import { getHandler, postHandler } from "./index.js";
import type { FastifyRequestWithSchema } from "../../../app.js";
import type { StubsGetSchema, StubsPostSchema } from "../../stubs.js";
import {
  stubsConfig,
  generateStubConfigCookieKey,
} from "./utils/stubsConfig/index.js";

vi.mock("../../../utils/getEnvironment/index.js", () => ({
  getEnvironment: vi.fn(() => "local"),
}));

vi.mock("./utils/paths/index.js", () => ({
  getPath: vi.fn(() => "/stubs"),
}));

describe("stubs handlers", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {
      render: vi.fn(),
      setCookie: vi.fn(),
      redirect: vi.fn(),
    } as unknown as FastifyReply;
  });

  describe("getHandler", () => {
    it("renders template without a success message", async () => {
      const request = {
        query: {},
      } as FastifyRequestWithSchema<typeof StubsGetSchema>;

      await getHandler(request, reply as FastifyReply);

      expect(reply.render).toHaveBeenCalledWith(
        "public/handlers/stubs/index.njk",
        expect.objectContaining({
          showSuccessMessage: false,
          stubsConfig,
          generateStubConfigCookieKey,
        }),
      );
    });

    it("renders template with a success message", async () => {
      const request = {
        query: { updated: 1 },
      } as FastifyRequestWithSchema<typeof StubsGetSchema>;

      await getHandler(request, reply as FastifyReply);

      expect(reply.render).toHaveBeenCalledWith(
        "public/handlers/stubs/index.njk",
        expect.objectContaining({
          showSuccessMessage: true,
          stubsConfig,
          generateStubConfigCookieKey,
        }),
      );
    });
  });

  describe("postHandler", () => {
    it("sets cookies and redirects", async () => {
      const request = {
        body: {
          stub_accountManagementApi_exampleEndpoint: "scenario2",
          no_match: "scenario1",
        },
      } as Partial<FastifyRequestWithSchema<typeof StubsPostSchema>>;

      await postHandler(
        request as FastifyRequestWithSchema<typeof StubsPostSchema>,
        reply as FastifyReply,
      );

      expect(reply.setCookie).toHaveBeenCalledExactlyOnceWith(
        "stub_accountManagementApi_exampleEndpoint",
        "scenario2",
        {
          httpOnly: true,
          maxAge: 31536000,
          sameSite: "lax",
          secure: false,
        },
      );
      expect(reply.redirect).toHaveBeenCalledWith("/stubs?updated=1");
    });
  });
});
