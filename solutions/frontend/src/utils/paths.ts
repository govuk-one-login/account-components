import { Scope } from "../../../commons/utils/authorize/getClaimsSchema.js";
import type { AcountDeleteJourneyState } from "../journeys/utils/stateMachines/account-delete.js";
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
    [Scope.accountDelete]: {
      TODO: {
        TODO: {
          path: "/TODO",
        },
      },
    },
  },
  others: {
    authorizeError: { path: "/authorize-error" },
    startSession: { path: "/start-session" },
  },
} as const satisfies {
  journeys: {
    [Scope.testingJourney]: Record<TestingJourneyState, PathsMap>;
    [Scope.accountDelete]: Record<AcountDeleteJourneyState, PathsMap>;
  };
  others: PathsMap;
};

export const initialJourneyPaths: Record<Scope, string> = {
  [Scope.testingJourney]:
    paths.journeys[Scope.testingJourney].PASSWORD_NOT_PROVIDED.step1.path,
  [Scope.accountDelete]: paths.journeys[Scope.accountDelete].TODO.TODO.path,
} as const;
