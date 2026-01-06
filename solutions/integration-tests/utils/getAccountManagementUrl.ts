import { env } from "../env.js";

export const getAccountManagementUrl = () => {
  if (env.TEST_TARGET === "local") {
    return "https://home.dev.account.gov.uk";
  }

  if (env.TEST_TARGET === "production") {
    return "https://home.account.gov.uk";
  }

  return `https://home.${env.TEST_TARGET}.account.gov.uk`;
};
