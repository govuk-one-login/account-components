import i18next from "i18next";
import type {
  onRequestAsyncHookHandler,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";

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
    request.lang =
      Object.values(Lang).find(
        (lng) => lng === request.query.lng || lng === request.cookies["lng"],
      ) ?? Lang.English;

    await i18next.init({
      lng: request.lang,
      fallbackLng: Lang.English,
      resources: {
        [Lang.English]: {
          translation: translations[Lang.English],
        },
        [Lang.Welsh]: {
          translation: translations[Lang.Welsh],
        },
      },
    });

    reply.i18next = i18next;
  };

  return setUpI18n;
};
