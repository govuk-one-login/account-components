import type { FastifyReply } from "fastify";
import { Scope } from "../../../commons/utils/authorize/getClaimsSchema.js";
import { AcountDeleteJourneyState } from "../journeys/utils/stateMachines/account-delete.js";
import { TestingJourneyState } from "../journeys/utils/stateMachines/testing-journey.js";

type PathsMap = Record<
  string,
  { path: `/${string}`; analytics?: FastifyReply["analytics"] }
>;

const accountDeleteAnalyticsDefaults: FastifyReply["analytics"] = {
  taxonomyLevel1: "TODO",
  taxonomyLevel2: "TODO",
  taxonomyLevel3: "TODO",
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
            isPageDataSensitive: false,
            contentId: "TODO",
          },
        },
        verifyEmailAddress: {
          path: "/delete-account/verify-email-address",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "TODO",
          },
        },
        resendEmailVerificationCode: {
          path: "/delete-account/resend-verification-code",
          analytics: {
            isPageDataSensitive: false,
            contentId: "TODO",
          },
        },
      },
      [AcountDeleteJourneyState.notAuthenticated]: {
        // TODO check these paths with UCD
        enterPassword: {
          path: "/delete-account/enter-password",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "TODO",
          },
        },
      },
      [AcountDeleteJourneyState.authenticated]: {
        // TODO check these paths with UCD
        confirm: {
          path: "/delete-account/confirm",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            isPageDataSensitive: false,
            contentId: "TODO",
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
