import type { Mock } from "vitest";
import { expect, it, describe, vi, beforeEach } from "vitest";
import { journeys } from "./index.js";
import { deleteAccount } from "./deleteAccount/index.js";
import type { FastifyInstance } from "fastify";

describe("journeys plugin", () => {
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
    journeys(mockFastify);

    expect(mockAddHook).toHaveBeenCalledWith("onRequest", expect.any(Function));
  });

  it("registers deleteAccount journey", () => {
    journeys(mockFastify);

    expect(mockRegister).toHaveBeenCalledWith(deleteAccount);
  });
});
