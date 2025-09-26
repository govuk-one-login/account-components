import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { frontend } from "./index.js";
import type { FastifyTypeboxInstance } from "../../app.js";

vi.mock("@fastify/session");
vi.mock("@fastify/helmet");
vi.mock("@fastify/csrf-protection");
vi.mock("@fastify/formbody");
vi.mock("../../utils/getEnvironment/index.js");
vi.mock("./journeys/index.js");

describe("frontend", () => {
  let mockApp: FastifyTypeboxInstance;
  let mockRegister: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRegister = vi.fn();

    mockApp = {
      register: mockRegister,
    } as unknown as FastifyTypeboxInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers all required plugins", async () => {
    const { getEnvironment } = await import(
      "../../utils/getEnvironment/index.js"
    );
    const { default: fastifyFormBody } = await import("@fastify/formbody");
    const { default: fastifyHelmet } = await import("@fastify/helmet");
    const { default: fastifySession } = await import("@fastify/session");
    const { default: fastifyCsrfProtection } = await import(
      "@fastify/csrf-protection"
    );
    const { journeys } = await import("./journeys/index.js");

    vi.mocked(getEnvironment).mockReturnValue("production");

    frontend(mockApp);

    expect(mockRegister).toHaveBeenCalledTimes(5);
    expect(mockRegister).toHaveBeenNthCalledWith(1, fastifyFormBody);
    expect(mockRegister).toHaveBeenNthCalledWith(2, fastifyHelmet);
    expect(mockRegister).toHaveBeenNthCalledWith(3, fastifySession, {
      secret: [
        "TODO a secret with minimum length of 32 characters fron an env variable which is populated from a secret in secrets manager!!!!!",
      ],
      cookie: {
        secure: true,
        sameSite: "lax",
      },
    });
    expect(mockRegister).toHaveBeenNthCalledWith(4, fastifyCsrfProtection, {
      sessionPlugin: "@fastify/session",
    });
    expect(mockRegister).toHaveBeenNthCalledWith(5, journeys);
  });

  it("configures session with secure: false for local environment", async () => {
    const { getEnvironment } = await import(
      "../../utils/getEnvironment/index.js"
    );
    vi.mocked(getEnvironment).mockReturnValue("local");

    frontend(mockApp);

    expect(mockRegister.mock.calls[2]![1]).toMatchObject({
      cookie: {
        secure: false,
      },
    });
  });
});
