import type { FastifyRequest } from "fastify";

export const unsuccessfulJourneyActionErrors = {
  userSignedOut: {
    code: 1001,
    description: "UserSignedOut",
    destroySession: true,
  },
  userAbortedJourney: {
    code: 1002,
    description: "UserAbortedJourney",
    destroySession: false,
  },
  userBackedOutOfJourney: {
    code: 1003,
    description: "UserBackedOutOfJourney",
    destroySession: false,
  },
} as const satisfies Record<
  string,
  {
    code: number;
    description: string;
    destroySession: boolean;
  }
>;

export type JourneyAction<
  Name extends string,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Details extends Record<string, unknown> = {},
> =
  | {
      action: Name;
    }
  | {
      action: Name;
      success: false;
      error: (typeof unsuccessfulJourneyActionErrors)[keyof typeof unsuccessfulJourneyActionErrors];
      timestamp: number;
    }
  | {
      action: Name;
      success: true;
      details: Details;
      timestamp: number;
    };

export const journeyActionNames = {
  testingJourneyAction: "testing-journey-action",
  accountDelete: "account-delete",
  passkeyCreate: "passkey-create",
} as const;

interface JourneyActionDetails {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  testingJourneyAction: {};
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  accountDelete: {};
  passkeyCreate: { aaguid: string };
}

type JourneyActions = {
  [K in keyof typeof journeyActionNames]: JourneyAction<
    (typeof journeyActionNames)[K],
    JourneyActionDetails[K]
  >;
};

type InProgressAction<T extends JourneyAction<string>> = Exclude<
  T,
  { success: boolean }
>;

type SuccessfulAction<T extends JourneyAction<string>> = Omit<
  Extract<T, { success: true }>,
  "timestamp" | "success"
>;

type FailedAction = Omit<
  Extract<JourneyActions[keyof JourneyActions], { success: false }>,
  "timestamp" | "success"
>;

export const startJourneyAction = <K extends keyof JourneyActions = never>(
  action: InProgressAction<JourneyActions[K]>,
  request: FastifyRequest,
) => {
  request.session.journeyActions ??= [];

  const inProgressAction = request.session.journeyActions.find(
    (journeyAction) =>
      journeyAction.action === action.action && !("success" in journeyAction),
  );

  if (!inProgressAction) {
    request.session.journeyActions.push(action);
  }
};

const updateInProgressAction = (
  action: Omit<JourneyAction<string>, "timestamp"> & { success: boolean },
  request: FastifyRequest,
): void => {
  if (!request.session.journeyActions) {
    throw new Error("There are no journey actions");
  }

  const index = request.session.journeyActions.findIndex(
    (journeyAction) =>
      journeyAction.action === action.action && !("success" in journeyAction),
  );

  if (index === -1) {
    throw new Error(
      `In progress action of type "${action.action}" not found in journey actions`,
    );
  }

  request.session.journeyActions[index] = { ...action, timestamp: Date.now() };
};

export const completeJourneyActionSuccessfully = <
  K extends keyof JourneyActions = never,
>(
  action: SuccessfulAction<JourneyActions[K]>,
  request: FastifyRequest,
) => {
  updateInProgressAction({ ...action, success: true }, request);
};

export const completeJourneyActionUnsuccessfully = (
  action: FailedAction,
  request: FastifyRequest,
) => {
  updateInProgressAction({ ...action, success: false }, request);
};
