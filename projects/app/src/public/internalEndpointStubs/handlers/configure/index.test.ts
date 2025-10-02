import { expect, it, describe, vi, beforeEach } from "vitest";
import type { FastifyReply } from "fastify";
import { postHandler } from "./index.js";
import type { FastifyRequestWithSchema } from "../../../../app.js";
import type { ConfigureInternalEndpointsPostSchema } from "../../index.js";

vi.mock("../../../../utils/getEnvironment/index.js", () => ({
  getEnvironment: vi.fn(() => "local"),
}));

vi.mock("./utils/paths/index.js", () => ({
  getPath: vi.fn(() => "/stubs/internal-endpoints"),
}));

describe("internalEndpointStubs handlers", () => {
  let reply: Partial<FastifyReply>;

  beforeEach(() => {
    reply = {
      render: vi.fn(),
      setCookie: vi.fn(),
      redirect: vi.fn(),
    } as unknown as FastifyReply;
  });

  describe("postHandler", () => {
    it("sets cookies and redirects", async () => {
      const request = {
        body: {
          internalEndpointStub_accountManagementApi_exampleEndpoint:
            "scenario2",
          no_match: "scenario1",
        },
      } as Partial<
        FastifyRequestWithSchema<typeof ConfigureInternalEndpointsPostSchema>
      >;

      await postHandler(
        request as FastifyRequestWithSchema<
          typeof ConfigureInternalEndpointsPostSchema
        >,
        reply as FastifyReply,
      );

      expect(reply.setCookie).toHaveBeenCalledExactlyOnceWith(
        "internalEndpointStub_accountManagementApi_exampleEndpoint",
        "scenario2",
        {
          httpOnly: true,
          maxAge: 31536000,
          sameSite: "lax",
          secure: false,
        },
      );
      expect(reply.redirect).toHaveBeenCalledWith(
        "/stubs/internal-endpoints/?updated=1",
      );
    });
  });
});
