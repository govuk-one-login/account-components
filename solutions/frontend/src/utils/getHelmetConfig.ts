import type { FastifyHelmetOptions } from "@fastify/helmet";
import { oneYearInSeconds } from "../../../commons/utils/constants.js";
import { getEnvironment } from "../../../commons/utils/getEnvironment/index.js";

export const getHelmetConfig = (): FastifyHelmetOptions => {
  return {
    enableCSPNonces: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://*.googletagmanager.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://*.ruxit.com",
          "https://*.dynatrace.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.googletagmanager.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://*.g.doubleclick.net",
        ],
        objectSrc: ["'none'"],
        connectSrc: [
          "'self'",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
          "https://*.g.doubleclick.net",
          "https://*.ruxit.com",
          "https://*.dynatrace.com",
        ],
        /*
        formAction must be null because it is possible to submit a form in AMC
        and go through a redirect chain directly to an RP callback URL on a domain
        which we don't control. There are lots of RP callback URLs and they are often
        being added/updated/deleted and so it is not possible to allowlist them all.
        */
        formAction: null,
        ...(getEnvironment() === "local"
          ? {
              upgradeInsecureRequests: null,
            }
          : {}),
      },
    },
    dnsPrefetchControl: {
      allow: false,
    },
    frameguard: {
      action: "deny",
    },
    hsts: {
      maxAge: oneYearInSeconds,
      preload: true,
      includeSubDomains: true,
    },
    referrerPolicy: false,
    permittedCrossDomainPolicies: {
      permittedPolicies: "none",
    },
  };
};
