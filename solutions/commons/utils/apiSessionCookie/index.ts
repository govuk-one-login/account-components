import { getEnvironment } from "../getEnvironment/index.js";

export const apiSessionCookieName = "apisession";

export const getApiSessionCookieOptions = (domain: string) =>
  ({
    httpOnly: true,
    secure: getEnvironment() !== "local",
    sameSite: "strict",
    domain,
  }) as const;
