import { describe, expect, it, vi, beforeEach } from "vitest";
import { getHelmetConfig } from "./getHelmetConfig.js";
import { oneYearInSeconds } from "../../../commons/utils/constants.js";

vi.mock(import("../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: vi.fn(),
}));

import { getEnvironment } from "../../../commons/utils/getEnvironment/index.js";

describe("getHelmetConfig", () => {
  beforeEach(() => {
    vi.mocked(getEnvironment).mockReturnValue("production");
  });

  it("should enable CSP nonces", () => {
    expect(getHelmetConfig().enableCSPNonces).toBe(true);
  });

  it("should set correct CSP directives", () => {
    const { directives } = getHelmetConfig().contentSecurityPolicy as {
      directives: Record<string, unknown>;
    };

    expect(directives["defaultSrc"]).toStrictEqual(["'self'"]);
    expect(directives["objectSrc"]).toStrictEqual(["'none'"]);
    expect(directives["formAction"]).toBeNull();
    expect(directives["scriptSrc"]).toContain("'self'");
    expect(directives["imgSrc"]).toContain("'self'");
    expect(directives["connectSrc"]).toContain("'self'");
  });

  it("should not include upgradeInsecureRequests in non-local environments", () => {
    const { directives } = getHelmetConfig().contentSecurityPolicy as {
      directives: Record<string, unknown>;
    };

    expect(directives).not.toHaveProperty("upgradeInsecureRequests");
  });

  it("should include upgradeInsecureRequests: null in local environment", () => {
    vi.mocked(getEnvironment).mockReturnValue("local");

    const { directives } = getHelmetConfig().contentSecurityPolicy as {
      directives: Record<string, unknown>;
    };

    expect(directives["upgradeInsecureRequests"]).toBeNull();
  });

  it("should disable DNS prefetch", () => {
    expect(getHelmetConfig().dnsPrefetchControl).toStrictEqual({
      allow: false,
    });
  });

  it("should deny framing", () => {
    expect(getHelmetConfig().frameguard).toStrictEqual({ action: "deny" });
  });

  it("should set HSTS with one year max age, preload and includeSubDomains", () => {
    expect(getHelmetConfig().hsts).toStrictEqual({
      maxAge: oneYearInSeconds,
      preload: true,
      includeSubDomains: true,
    });
  });

  it("should disable referrer policy", () => {
    expect(getHelmetConfig().referrerPolicy).toBe(false);
  });

  it("should set permittedCrossDomainPolicies to none", () => {
    expect(getHelmetConfig().permittedCrossDomainPolicies).toStrictEqual({
      permittedPolicies: "none",
    });
  });
});
