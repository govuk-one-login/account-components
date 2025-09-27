import { expect, it, describe, afterEach } from "vitest";
import initApp from "./app.js";

describe("app", () => {
  const originalEnv = JSON.stringify(process.env);

  afterEach(() => {
    process.env = JSON.parse(originalEnv) as NodeJS.ProcessEnv;
  });

  it("doesn't register routes", async () => {
    process.env = {
      ...process.env,
      REGISTER_PUBLIC_ROUTES: "0",
      REGISTER_PRIVATE_ROUTES: "0",
    };

    const app = await initApp();

    expect(
      (
        await app.inject({
          method: "GET",
          url: "/healthcheck",
        })
      ).statusCode,
    ).toBe(404);

    expect(
      (
        await app.inject({
          method: "GET",
          url: "/private-healthcheck",
        })
      ).statusCode,
    ).toBe(404);
  });

  it("does register routes", async () => {
    process.env = {
      ...process.env,
      REGISTER_PUBLIC_ROUTES: "1",
      REGISTER_PRIVATE_ROUTES: "1",
    };

    const app = await initApp();

    expect(
      (
        await app.inject({
          method: "GET",
          url: "/healthcheck",
        })
      ).statusCode,
    ).toBe(200);

    expect(
      (
        await app.inject({
          method: "GET",
          url: "/private-healthcheck",
        })
      ).statusCode,
    ).toBe(200);
  });

  it("handles errors with setErrorHandler and doesn't reveal error details", async () => {
    const app = await initApp();

    app.get("/test-error", async () => {
      throw new Error("Test error");
    });

    const response = await app.inject({
      method: "GET",
      url: "/test-error",
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe("An error occurred");
  });
});
