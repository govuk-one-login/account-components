import type { authorizeErrors } from "./authorizeErrors.js";

export const getRedirectToClientRedirectUri = (
  redirectUri: string,
  error?: (typeof authorizeErrors)[keyof typeof authorizeErrors],
  state?: string,
  code?: string,
  redirectUriIsRelative = false,
) => {
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
  return redirectUriIsRelative ? url.pathname + url.search : url.toString();
};
