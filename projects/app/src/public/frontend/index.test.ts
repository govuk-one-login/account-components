import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { frontend } from "./index.js";
import type { FastifyTypeboxInstance } from "../../app.js";

vi.mock("@fastify/session");
vi.mock("../../utils/getEnvironment/index.js");

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

  it("configures session with secure: true for production environment", async () => {
    const { getEnvironment } = await import(
      "../../utils/getEnvironment/index.js"
    );
    const { default: fastifySession } = await import("@fastify/session");

    vi.mocked(getEnvironment).mockReturnValue("production");

    frontend(mockApp);

    expect(mockRegister).toHaveBeenCalledWith(fastifySession, {
      secret: [
        "TODO a secret with minimum length of 32 characters fron an env variable which is populated from a secret in secrets manager!!!!!",
      ],
      cookie: {
        secure: true,
        sameSite: "lax",
      },
    });
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
