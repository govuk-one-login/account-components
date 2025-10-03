import i18next from "i18next";
import { Lang } from "../../../app.js";
import en from "../../../translations/en.json" with { type: "json" };
import cy from "../../../translations/cy.json" with { type: "json" };
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

export const setUpI18n: SetUpI18n = async function (request, reply) {
  request.lang =
    Object.values(Lang).find(
      (lng) => lng === request.query.lng || lng === request.cookies["lng"],
    ) ?? Lang.English;

  await i18next.init({
    lng: request.lang,
    fallbackLng: Lang.English,
    resources: {
      [Lang.English]: {
        translation: en,
      },
      [Lang.Welsh]: {
        translation: cy,
      },
    },
  });

  i18next.addResourceBundle(Lang.Welsh, "translation", {
    FECTranslations: frontendUiTranslationCy,
  });

  i18next.addResourceBundle(Lang.English, "translation", {
    FECTranslations: frontendUiTranslationEn,
  });

  reply.i18next = i18next;
};
