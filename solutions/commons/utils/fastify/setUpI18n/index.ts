import i18next from "i18next";
import type {
  onRequestAsyncHookHandler,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import {
  frontendUiTranslationCy,
  frontendUiTranslationEn,
} from "@govuk-one-login/frontend-ui";
import { LanguageDetector } from "i18next-http-middleware";
import { getEnvironment } from "../../getEnvironment/index.js";

export enum Lang {
  English = "en",
  Welsh = "cy",
}

type SetUpI18n = onRequestAsyncHookHandler<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  {
    Querystring: {
      lng?: string;
    };
  }
>;

export const setUpI18n = (translations: {
  [Lang.English]: object;
  [Lang.Welsh]: object;
}) => {
  const setUpI18n: SetUpI18n = async function (request, reply) {
    // this should be handled by i18next-http-middleware out-of-the-box, but it doesn't appear to be working currently so we are doing it manually here
    // priority: query string, cookie, default to English
    request.lang =
      Object.values(Lang).find((lng) => {
        if (request.query.lng) return lng === (request.query.lng as Lang);
        // only check cookie if lng query string does not exist
        return lng === request.cookies["lng"];
      }) ?? Lang.English;

    await i18next.use(LanguageDetector).init({
      debug: false,
      fallbackLng: [Lang.English],
      lng: request.lang,
      preload: [Lang.English],
      supportedLngs: [Lang.English, Lang.Welsh],
      resources: {
        [Lang.English]: {
          translation: {
            ...translations[Lang.English],
            FECTranslations: frontendUiTranslationEn,
          },
        },
        [Lang.Welsh]: {
          translation: {
            ...translations[Lang.Welsh],
            FECTranslations: frontendUiTranslationCy,
          },
        },
      },
      detection: {
        lookupCookie: "lng",
        lookupQuerystring: "lng",
        order: ["querystring", "cookie"],
        caches: ["cookie"],
        ignoreCase: true,
        cookieSecure: getEnvironment() !== "local" && "secure",
        cookieDomain:
          getEnvironment() === "local" ? "localhost" : "account.gov.uk",
        cookieSameSite: "lax",
      },
    });

    reply.i18next = i18next;
  };

  return setUpI18n;
};
