import { getEnvironment } from "../getEnvironment/index.js";

export const apiSessionCookieName = "apisession";

// Purposely no maxAge or expires as we want it to be a session cookie
export const getApiSessionCookieOptions = (domain: string) =>
  ({
    httpOnly: true,
    secure: getEnvironment() !== "local",
    sameSite: "strict",
    domain,
  }) as const;
