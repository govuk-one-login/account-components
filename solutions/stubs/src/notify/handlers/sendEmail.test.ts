import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("../../../../commons/utils/logger/index.js"));

const mockTemplateIds = {
  CREATE_PASSKEY_WITH_PASSKEY_NAME: "template-id-1",
  CREATE_PASSKEY_WITHOUT_PASSKEY_NAME: "template-id-2",
};

describe("sendEmailPostHandler", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let sendEmailPostHandler: (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<FastifyReply>;
  let logger: Awaited<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import("../../../../commons/utils/logger/index.js")
  >["logger"];

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env["NOTIFY_TEMPLATE_IDS"] = JSON.stringify(mockTemplateIds);

    mockReply = {
      send: vi.fn().mockReturnThis(),
    };

    ({ sendEmailPostHandler } = await import("./sendEmail.js"));
    ({ logger } = await import("../../../../commons/utils/logger/index.js"));
  });

  it("should return id and reference when reference is provided", async () => {
    mockRequest = {
      body: { template_id: "template-id-1", reference: "test-reference" },
    };

    await sendEmailPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(logger.info).toHaveBeenCalledWith("NotifySendEmailCalled", {
      reference: "test-reference",
      templateId: "template-id-1",
      template: "CREATE_PASSKEY_WITH_PASSKEY_NAME",
    });
    expect(mockReply.send).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        reference: "test-reference",
      },
    });
  });

  it("should return id and undefined reference when reference is not provided", async () => {
    mockRequest = { body: { template_id: "template-id-2" } };

    await sendEmailPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(logger.info).toHaveBeenCalledWith("NotifySendEmailCalled", {
      reference: undefined,
      templateId: "template-id-2",
      template: "CREATE_PASSKEY_WITHOUT_PASSKEY_NAME",
    });
    expect(mockReply.send).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        reference: undefined,
      },
    });
  });

  it("should log undefined template when template_id is not recognised", async () => {
    mockRequest = { body: { template_id: "unknown-template-id" } };

    await sendEmailPostHandler(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
    );

    expect(logger.info).toHaveBeenCalledWith("NotifySendEmailCalled", {
      reference: undefined,
      templateId: "unknown-template-id",
      template: undefined,
    });
  });

  it("should throw when body is invalid", async () => {
    mockRequest = { body: { template_id: 123 } };

    await expect(
      sendEmailPostHandler(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      ),
    ).rejects.toThrow();
  });
});
