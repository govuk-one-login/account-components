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
      REGISTER_STUB_ROUTES: "0",
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
      REGISTER_STUB_ROUTES: "1",
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
});
