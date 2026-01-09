import { Scope } from "../../../commons/utils/authorize/getClaimsSchema.js";
import { AcountDeleteJourneyState } from "../journeys/utils/stateMachines/account-delete.js";
import { PasskeyCreateState } from "../journeys/utils/stateMachines/passkey-create.js";
import { TestingJourneyState } from "../journeys/utils/stateMachines/testing-journey.js";

type PathsMap = Record<string, { path: `/${string}` }>;

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
        create: {
          path: "/create-passkey/create",
        },
      },
      [PasskeyCreateState.created]: {
        success: {
          path: "/create-passkey/success",
        },
      },
    },
    [Scope.accountDelete]: {
      [AcountDeleteJourneyState.emailNotVerified]: {
        // TODO check these paths with UCD
        introduction: {
          path: "/delete-account/introduction",
        },
        verifyEmailAddress: {
          path: "/delete-account/verify-email-address",
        },
        resendEmailVerificationCode: {
          path: "/delete-account/resend-verification-code",
        },
      },
      [AcountDeleteJourneyState.notAuthenticated]: {
        // TODO check these paths with UCD
        enterPassword: {
          path: "/delete-account/enter-password",
        },
      },
      [AcountDeleteJourneyState.authenticated]: {
        // TODO check these paths with UCD
        confirm: {
          path: "/delete-account/confirm",
        },
      },
    },
    others: {
      goToClientCallback: { path: "/go-to-client-callback" },
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
    paths.journeys[Scope.passkeyCreate].NOT_CREATED.create.path,
} as const;
