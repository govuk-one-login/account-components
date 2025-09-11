import { expect, it, describe, vi, beforeEach } from "vitest";
import type { FastifyReply } from "fastify";
import { getHandler, postHandler } from "./index.js";
import type { FastifyRequestWithSchema } from "../../../../app.js";
import type {
  ConfigureExternalEndpointsGetSchema,
  ConfigureExternalEndpointsPostSchema,
} from "../../../externalEndpointStubs.js";
import {
  externalEndpointStubsConfig,
  generateExternalEndpointStubConfigCookieKey,
} from "../utils/config/index.js";

vi.mock("../../../../utils/getEnvironment/index.js", () => ({
  getEnvironment: vi.fn(() => "local"),
}));

vi.mock("./utils/paths/index.js", () => ({
  getPath: vi.fn(() => "/stubs/external-endpoints"),
}));

describe("externalEndpointStubs handlers", () => {
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
      } as FastifyRequestWithSchema<typeof ConfigureExternalEndpointsGetSchema>;

      await getHandler(request, reply as FastifyReply);

      expect(reply.render).toHaveBeenCalledWith(
        "public/handlers/externalEndpointStubs/configure/index.njk",
        expect.objectContaining({
          showSuccessMessage: false,
          externalEndpointStubsConfig,
          generateExternalEndpointStubConfigCookieKey,
        }),
      );
    });

    it("renders template with a success message", async () => {
      const request = {
        query: { updated: 1 },
      } as FastifyRequestWithSchema<typeof ConfigureExternalEndpointsGetSchema>;

      await getHandler(request, reply as FastifyReply);

      expect(reply.render).toHaveBeenCalledWith(
        "public/handlers/externalEndpointStubs/configure/index.njk",
        expect.objectContaining({
          showSuccessMessage: true,
          externalEndpointStubsConfig,
          generateExternalEndpointStubConfigCookieKey,
        }),
      );
    });
  });

  describe("postHandler", () => {
    it("sets cookies and redirects", async () => {
      const request = {
        body: {
          externalEndpointStub_accountManagementApi_exampleEndpoint:
            "scenario2",
          no_match: "scenario1",
        },
      } as Partial<
        FastifyRequestWithSchema<typeof ConfigureExternalEndpointsPostSchema>
      >;

      await postHandler(
        request as FastifyRequestWithSchema<
          typeof ConfigureExternalEndpointsPostSchema
        >,
        reply as FastifyReply,
      );

      expect(reply.setCookie).toHaveBeenCalledExactlyOnceWith(
        "externalEndpointStub_accountManagementApi_exampleEndpoint",
        "scenario2",
        {
          httpOnly: true,
          maxAge: 31536000,
          sameSite: "lax",
          secure: false,
        },
      );
      expect(reply.redirect).toHaveBeenCalledWith(
        "/stubs/external-endpoints/?updated=1",
      );
    });
  });
});
