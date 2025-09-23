import fp from "fastify-plugin";
import i18next from "i18next";
import { Lang } from "../../app.js";
import en from "../../translations/en.json" with { type: "json" };
import cy from "../../translations/cy.json" with { type: "json" };
import type {
  onRequestAsyncHookHandler,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";

type Handler = onRequestAsyncHookHandler<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  {
    Querystring: {
      lng?: string;
    };
  }
>;

const handler: Handler = async (request, reply) => {
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

export const setUpI18n = fp(function (app) {
  app.addHook("onRequest", handler);
});
