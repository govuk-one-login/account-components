import type { FastifyReply } from "fastify";
import { AcountDeleteJourneyState } from "../journeys/utils/stateMachines/account-delete.js";
import { PasskeyCreateState } from "../journeys/utils/stateMachines/passkey-create.js";
import { TestingJourneyState } from "../journeys/utils/stateMachines/testing-journey.js";
import { Scope } from "../../../commons/utils/commonTypes.js";
import { analyticsDefaults } from "./constants.js";

export type PathsMap = Record<
  string,
  { path: `/${string}`; analytics?: FastifyReply["analytics"] }
>;

const accountDeleteAnalyticsDefaults: FastifyReply["analytics"] = {
  ...analyticsDefaults,
  taxonomyLevel2: "SSAD",
};

const passkeyAnalyticsDefaults: FastifyReply["analytics"] = {
  ...analyticsDefaults,
  taxonomyLevel2: "manage",
  taxonomyLevel3: "passkey",
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
    [Scope.passkeyCreate]: {
      [PasskeyCreateState.notCreated]: {
        setUpPasskey: {
          path: "/set-up-passkey",
          analytics: passkeyAnalyticsDefaults,
        },
        cannotSetUpPasskey: {
          path: "/cannot-set-up-passkey",
          analytics: passkeyAnalyticsDefaults,
        },
      },
    },
    [Scope.accountDelete]: {
      [AcountDeleteJourneyState.emailNotVerified]: {
        introduction: {
          path: "/reset-delete/start",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "36280f17-e3ef-4ff7-832a-d22a42a97d1c",
          },
        },
        verifyEmailAddress: {
          path: "/reset-delete/check-email",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "bf64f1ae-1016-40f5-bd83-86e63e859507",
          },
        },
        resendEmailVerificationCode: {
          path: "/reset-delete/resend-email-code",
          analytics: {
            contentId: "a5e9bf87-64bd-4f6e-98bd-87220a638085",
          },
        },
      },
      [AcountDeleteJourneyState.lockedOutSecurityCodeEnteredTooManyTimes]: {
        lockedOutSecurityCodeEnteredTooManyTimes: {
          path: "/reset-delete/security-code-entered-exceeded",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "a3e221fb-2a5f-455c-a140-d8340377e644",
          },
        },
      },
      [AcountDeleteJourneyState.lockedOutPasswordEnteredTooManyTimes]: {
        lockedOutPasswordEnteredTooManyTimes: {
          path: "/reset-delete/password-entered-exceeded",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "51520436-ac01-4c1a-8e52-99260c8da7d6",
          },
        },
      },
      [AcountDeleteJourneyState.lockedOutSecurityCodeRequestedTooManyTimes]: {
        lockedOutSecurityCodeRequestedTooManyTimes: {
          path: "/reset-delete/security-code-requested-too-many-times",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "9ce0496f-ab95-444d-9c93-5cb1a2fb0b22",
          },
        },
      },
      [AcountDeleteJourneyState.notAuthenticated]: {
        enterPassword: {
          path: "/reset-delete/enter-password",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "af085f33-01f4-453a-a99b-d82ff1f4144b",
          },
        },
      },
      [AcountDeleteJourneyState.authenticated]: {
        confirm: {
          path: "/reset-delete/confirm",
          analytics: {
            ...accountDeleteAnalyticsDefaults,
            contentId: "9141ea01-aca4-46d6-b48d-044d3ac7ff7a",
          },
        },
      },
    },
    others: {
      completeFailedJourney: { path: "/complete-failed-journey" },
    },
  },
  others: {
    authorize: { path: "/authorize" },
    authorizeError: {
      path: "/error",
      analytics: {
        ...analyticsDefaults,
        contentId: "a1a3dddd-9e65-40dc-9256-12ed597ec40e",
      },
    },
    pageExpired: {
      path: "/page-expired",
      analytics: {
        ...analyticsDefaults,
        contentId: "aac61239-99f2-4b93-b947-cf5bd4385f79",
      },
    },
  },
} as const satisfies {
  journeys: {
    others: PathsMap;
    [Scope.testingJourney]: Record<TestingJourneyState, PathsMap>;
    [Scope.accountDelete]: Record<AcountDeleteJourneyState, PathsMap>;
    [Scope.passkeyCreate]: Record<PasskeyCreateState, PathsMap>;
  };
  others: PathsMap;
};

export const initialJourneyPaths: Record<Scope, string> = {
  [Scope.testingJourney]:
    paths.journeys[Scope.testingJourney].PASSWORD_NOT_PROVIDED.step1.path,
  [Scope.accountDelete]:
    paths.journeys[Scope.accountDelete].EMAIL_NOT_VERIFIED.introduction.path,
  [Scope.passkeyCreate]:
    paths.journeys[Scope.passkeyCreate].NOT_CREATED.setUpPasskey.path,
} as const;
