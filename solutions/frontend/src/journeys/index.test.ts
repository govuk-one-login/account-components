import type { Mock } from "vitest";
import { expect, it, describe, vi, beforeEach } from "vitest";
import { journeyRoutes } from "./index.js";
import { deleteAccount } from "./account-delete/index.js";
import type { FastifyInstance } from "fastify";

describe("journeyRoutes plugin", () => {
  let mockFastify: FastifyInstance;
  let mockAddHook: Mock;
  let mockRegister: Mock;

  beforeEach(() => {
    mockAddHook = vi.fn();
    mockRegister = vi.fn();

    mockFastify = {
      addHook: mockAddHook,
      register: mockRegister,
    } as unknown as FastifyInstance;
  });

  it("adds onRequest hook", () => {
    journeyRoutes(mockFastify);

    expect(mockAddHook).toHaveBeenCalledWith("onRequest", expect.any(Function));
  });

  it("registers deleteAccount journey", () => {
    journeyRoutes(mockFastify);

    expect(mockRegister).toHaveBeenCalledWith(deleteAccount);
  });
});
