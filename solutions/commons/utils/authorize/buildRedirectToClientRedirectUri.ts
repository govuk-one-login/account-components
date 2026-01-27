import type { authorizeErrors } from "./authorizeErrors.js";

export const buildRedirectToClientRedirectUri = (
  redirectUri: string,
  error?: (typeof authorizeErrors)[keyof typeof authorizeErrors],
  state?: string,
  code?: string,
) => {
  const url = new URL(redirectUri);
  if (error) {
    url.searchParams.set("error", error.type);
    url.searchParams.set("error_description", error.description);
  } else if (code) {
    url.searchParams.set("code", code);
  }
  if (state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
};
