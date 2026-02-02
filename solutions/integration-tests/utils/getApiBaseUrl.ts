import { env } from "../env.js";

export const getApiBaseUrl = () => {
  if (env.TEST_TARGET === "local") {
    return "http://localhost:6004";
  }

  if (env.TEST_TARGET === "production") {
    return "https://api.manage.account.gov.uk";
  }

  return `https://api.manage.${env.TEST_TARGET}.account.gov.uk`;
};
