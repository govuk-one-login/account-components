import * as v from "valibot";

export const getQueryParamsFromUrl = (uri: string) => {
  const isRelativeUrl = !v.safeParse(v.pipe(v.string(), v.url()), uri).success;
  const url = new URL(uri, isRelativeUrl ? "http://localhost" : undefined);
  return url.searchParams;
};
