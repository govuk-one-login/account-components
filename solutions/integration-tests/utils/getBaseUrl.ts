import { env } from "../env.js";

export const getBaseUrl = () => {
  if (env.TEST_TARGET === "local") {
    return "http://localhost:6002";
  }

  if (env.TEST_TARGET === "production") {
    return "https://manage.account.gov.uk";
  }

  return `https://manage.${env.TEST_TARGET}.account.gov.uk`;
};
