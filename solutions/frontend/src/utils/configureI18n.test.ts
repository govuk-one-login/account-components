import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { configureI18n, Lang } from "./configureI18n.js";
import i18next from "i18next";
import { LanguageDetector } from "i18next-http-middleware";
import { getEnvironment } from "../../../commons/utils/getEnvironment/index.js";

vi.mock(import("../../../commons/utils/getEnvironment/index.js"), () => ({
  getEnvironment: vi.fn(),
}));

vi.mock(import("./constants.js"), () => ({
  rootCookieDomain: "account.gov.uk",
}));

// @ts-expect-error
vi.mock(import("i18next"), () => {
  const mockI18next = {
    use: vi.fn().mockReturnThis(),
    init: vi.fn(),
  };
  mockI18next.use.mockReturnValue(mockI18next);
  return { default: mockI18next };
});

vi.mock(import("i18next-http-middleware"), () => ({
  LanguageDetector: vi.fn(),
}));

describe("configureI18n", () => {
  const mockTranslations = {
    [Lang.English]: { hello: "Hello" },
    [Lang.Welsh]: { hello: "Helo" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(i18next.use).mockReturnValue(i18next);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes i18next with correct configuration for local environment", async () => {
    vi.mocked(getEnvironment).mockReturnValue("local");

    await configureI18n(mockTranslations);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(i18next.use).toHaveBeenCalledExactlyOnceWith(LanguageDetector);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(i18next.init).toHaveBeenCalledExactlyOnceWith({
      showSupportNotice: false,
      fallbackLng: [Lang.English],
      supportedLngs: [Lang.English, Lang.Welsh],
      resources: {
        [Lang.English]: {
          translation: {
            hello: "Hello",
          },
        },
        [Lang.Welsh]: {
          translation: {
            hello: "Helo",
          },
        },
      },
      detection: {
        lookupCookie: "lng",
        lookupQuerystring: "lng",
        order: ["querystring", "cookie"],
        ignoreCase: true,
        caches: ["cookie"],
        cookieSecure: false,
        cookieDomain: "account.gov.uk",
        cookieSameSite: "none",
      },
    });
  });

  it("initializes i18next with secure cookies for non-local environment", async () => {
    vi.mocked(getEnvironment).mockReturnValue("production");

    await configureI18n(mockTranslations);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(i18next.init).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        detection: expect.objectContaining({
          cookieSecure: true,
          cookieDomain: "account.gov.uk",
        }),
      }),
    );
  });
});
