import type { authorizeErrors } from "./authorizeErrors.js";
import * as v from "valibot";

export const buildRedirectToClientRedirectUri = (
  redirectUri: string,
  error?: (typeof authorizeErrors)[keyof typeof authorizeErrors],
  state?: string,
  code?: string,
) => {
  const isRelativeUrl = !v.safeParse(v.pipe(v.string(), v.url()), redirectUri)
    .success;

  const url = new URL(redirectUri, "http://localhost");
  if (error) {
    url.searchParams.set("error", error.type);
    url.searchParams.set("error_description", error.description);
  } else if (code) {
    url.searchParams.set("code", code);
  }
  if (state) {
    url.searchParams.set("state", state);
  }

  return isRelativeUrl ? url.pathname + url.search : url.toString();
};
