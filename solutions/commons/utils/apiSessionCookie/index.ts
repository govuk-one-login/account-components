export const apiSessionCookieName = "apisession";

export const getApiSessionCookieOptions = (domain: string) =>
  ({
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    domain,
  }) as const;
