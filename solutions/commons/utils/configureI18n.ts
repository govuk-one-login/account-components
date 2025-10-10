import {
  frontendUiTranslationCy,
  frontendUiTranslationEn,
} from "@govuk-one-login/frontend-ui";
import i18next from "i18next";
import { LanguageDetector } from "i18next-http-middleware";
import { getEnvironment } from "./getEnvironment/index.js";

export enum Lang {
  English = "en",
  Welsh = "cy",
}

export const configureI18n = async (translations: Record<Lang, object>) => {
  await i18next.use(LanguageDetector).init({
    fallbackLng: [Lang.English],
    supportedLngs: Object.values(Lang),
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
      ignoreCase: true,
      caches: ["cookie"],
      cookieSecure: getEnvironment() !== "local",
      cookieDomain: getEnvironment() !== "local" && "account.gov.uk",
      cookieSameSite: "lax",
    },
  });
};
