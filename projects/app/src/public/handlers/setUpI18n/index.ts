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

  reply.i18next = i18next;
};
