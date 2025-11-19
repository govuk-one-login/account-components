import { env } from "../env.js";

export const getStubsUrl = () => {
  if (env.TEST_TARGET === "local") {
    return "http://localhost:6003";
  }

  if (env.TEST_TARGET === "production") {
    return "https://stubs.manage.account.gov.uk";
  }

  return `https://stubs.manage.${env.TEST_TARGET}.account.gov.uk`;
};
