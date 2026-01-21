import type { FastifyReply } from "fastify";
import { Scope } from "../../../commons/utils/authorize/getClaimsSchema.js";
import { AcountDeleteJourneyState } from "../journeys/utils/stateMachines/account-delete.js";
import { TestingJourneyState } from "../journeys/utils/stateMachines/testing-journey.js";

type PathsMap = Record<
  string,
  { path: `/${string}`; analytics?: FastifyReply["analytics"] }
>;

const analyticsDefaults: FastifyReply["analytics"] = {
  taxonomyLevel1: "accounts",
};

const accountDeleteAnalyticsDefaults: FastifyReply["analytics"] = {
  ...analyticsDefaults,
  taxonomyLevel2: "SSAD",
};

export const paths = {
  journeys: {
    [Scope.testingJourney]: {
      [TestingJourneyState.passwordNotProvided]: {
        step1: {
          path: "/testing-journey/step-1",
        },
        enterPassword: {
          path: "/testing-journey/enter-password",
        },
      },
      [TestingJourneyState.passwordProvided]: {
        confirm: {
          path: "/testing-journey/confirm",
        },
      },
    },
    [Scope.accountDelete]: {
      [AcountDeleteJourneyState.emailNotVerified]: {
        // TODO check these paths with UCD
        introduction: {
          path: "/delete-account/introduction",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "36280f17-e3ef-4ff7-832a-d22a42a97d1c",
          },
        },
        verifyEmailAddress: {
          path: "/delete-account/verify-email-address",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "bf64f1ae-1016-40f5-bd83-86e63e859507",
          },
        },
        resendEmailVerificationCode: {
          path: "/delete-account/resend-verification-code",
          analytics: {
            contentId: "a5e9bf87-64bd-4f6e-98bd-87220a638085",
          },
        },
      },
      [AcountDeleteJourneyState.notAuthenticated]: {
        // TODO check these paths with UCD
        enterPassword: {
          path: "/delete-account/enter-password",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "af085f33-01f4-453a-a99b-d82ff1f4144b",
          },
        },
      },
      [AcountDeleteJourneyState.authenticated]: {
        // TODO check these paths with UCD
        confirm: {
          path: "/delete-account/confirm",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "9141ea01-aca4-46d6-b48d-044d3ac7ff7a",
          },
        },
      },
    },
    others: {
      goToClientRedirectUri: { path: "/go-to-client-redirect-uri" },
    },
  },
  others: {
    authorizeError: { path: "/authorize-error" },
    startSession: { path: "/start-session" },
  },
} as const satisfies {
  journeys: {
    others: PathsMap;
    [Scope.testingJourney]: Record<TestingJourneyState, PathsMap>;
    [Scope.accountDelete]: Record<AcountDeleteJourneyState, PathsMap>;
  };
  others: PathsMap;
};

export const initialJourneyPaths: Record<Scope, string> = {
  [Scope.testingJourney]:
    paths.journeys[Scope.testingJourney].PASSWORD_NOT_PROVIDED.step1.path,
  [Scope.accountDelete]:
    paths.journeys[Scope.accountDelete].EMAIL_NOT_VERIFIED.introduction.path,
} as const;
