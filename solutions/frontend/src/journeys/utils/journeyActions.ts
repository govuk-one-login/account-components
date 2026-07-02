import type { FastifyReply, FastifyRequest } from "fastify";
import {
  getCommonAuditEventProps,
  sendAuditEvent,
} from "../../../../commons/utils/auditEvents/index.js";
import { createEvent } from "@govuk-one-login/event-catalogue-utils";
import assert from "node:assert";
import type { DistributiveOmit } from "../../../../commons/utils/commonTypes.js";

export const journeyActionNames = {
  testingJourneyAction: "testing-journey-action",
  tempAccountDeleteAction: "temp-account-delete-action",
  passkeyCreate: "passkey-create",
} as const;
export type JourneyActionName =
  (typeof journeyActionNames)[keyof typeof journeyActionNames];

type JourneyActionError = Record<
  string,
  {
    code: number;
    description: string;
    destroySession: boolean;
  }
>;

export const simpleUnsuccessfulJourneyActionErrors = {
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
} as const satisfies JourneyActionError;

const complexUnsuccessfulJourneyActionErrors = {
  accountHasInterventions: {
    code: 1004,
    description: "AccountHasInterventions",
    destroySession: false,
  },
} as const satisfies JourneyActionError;

interface UnsuccessfulJourneyActionErrorExtras {
  accountHasInterventions: {
    accountInterventionsStatus: {
      state: {
        blocked: boolean;
        suspended: boolean;
        resetPassword?: boolean;
        reproveIdentity?: boolean;
      };
    };
  };
}

export const unsuccessfulJourneyActionErrors = {
  ...simpleUnsuccessfulJourneyActionErrors,
  ...complexUnsuccessfulJourneyActionErrors,
} as const satisfies JourneyActionError;

export type JourneyAction<
  Name extends JourneyActionName,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Details extends Record<string, unknown> = {},
> =
  | {
      action: Name;
      startedAt: number;
    }
  | {
      action: Name;
      success: false;
      error: (typeof unsuccessfulJourneyActionErrors)[keyof typeof unsuccessfulJourneyActionErrors] & {
        extras?: Record<string, unknown>;
      };
      startedAt: number;
      completedAt: number;
    }
  | {
      action: Name;
      success: true;
      details: Details;
      startedAt: number;
      completedAt: number;
    };

interface JourneyActionDetails {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  testingJourneyAction: {};
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  tempAccountDeleteAction: {};
  passkeyCreate: { aaguid: string };
}

type JourneyActions = {
  [K in keyof typeof journeyActionNames]: JourneyAction<
    (typeof journeyActionNames)[K],
    JourneyActionDetails[K]
  >;
};

type InProgressAction<T extends JourneyAction<JourneyActionName>> = Omit<
  Exclude<T, { success: boolean }>,
  "startedAt"
>;

type SuccessfulAction<T extends JourneyAction<JourneyActionName>> = Omit<
  Extract<T, { success: true }>,
  "startedAt" | "completedAt" | "success"
>;

type FailedAction =
  | {
      [K in keyof typeof complexUnsuccessfulJourneyActionErrors]: {
        action: JourneyActionName;
        error: (typeof complexUnsuccessfulJourneyActionErrors)[K] &
          (UnsuccessfulJourneyActionErrorExtras[K] extends undefined
            ? { extras?: never }
            : { extras: UnsuccessfulJourneyActionErrorExtras[K] });
      };
    }[keyof typeof complexUnsuccessfulJourneyActionErrors]
  | {
      [K in keyof typeof simpleUnsuccessfulJourneyActionErrors]: {
        action: JourneyActionName;
        error: (typeof simpleUnsuccessfulJourneyActionErrors)[K];
      };
    }[keyof typeof simpleUnsuccessfulJourneyActionErrors];

export const startJourneyAction = async <
  K extends keyof JourneyActions = never,
>(
  action: InProgressAction<JourneyActions[K]>,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  request.session.journeyActions ??= [];

  const inProgressActionExists = request.session.journeyActions.some(
    (journeyAction) =>
      journeyAction.action === action.action && !("success" in journeyAction),
  );

  if (!inProgressActionExists) {
    request.session.journeyActions.push({
      ...action,
      startedAt: Date.now(),
    });

    if (request.awsLambda?.event) {
      assert.ok(request.session.claims);

      const commonAuditEventProps = getCommonAuditEventProps(
        request.awsLambda.event,
      );

      await sendAuditEvent(
        createEvent("AMC_ACTION_STARTED", {
          ...commonAuditEventProps,
          event_name: "AMC_ACTION_STARTED",
          client_id: request.session.claims.client_id,
          extensions: {
            // @ts-expect-error
            account_action: action.action,
            // @ts-expect-error
            amc_scope: request.session.claims.scope,
            "journey-type":
              reply.client?.journey_types_by_scope?.[
                request.session.claims.scope
              ],
          },
          user: {
            ...commonAuditEventProps.user,
            email: request.session.claims.email,
            user_id: request.session.claims.sub,
          },
        }),
      );
    }
  }
};

const completeInProgressAction = (
  completedAt: Date,
  action: DistributiveOmit<
    JourneyAction<JourneyActionName>,
    "startedAt" | "completedAt"
  > & {
    success: boolean;
  },
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
  assert.ok(request.session.journeyActions[index]);

  request.session.journeyActions[index] = {
    ...request.session.journeyActions[index],
    ...action,
    completedAt: completedAt.getTime(),
  };
};

const sendCompletedActionAuditEvent = async (
  completedAt: Date,
  request: FastifyRequest,
  reply: FastifyReply,
  action:
    | {
        name: string;
        success: true;
      }
    | {
        name: string;
        success: false;
        error: string;
      },
) => {
  if (request.awsLambda?.event) {
    assert.ok(request.session.claims);

    const commonAuditEventProps = getCommonAuditEventProps(
      request.awsLambda.event,
    );

    await sendAuditEvent(
      createEvent("AMC_ACTION_COMPLETED", {
        ...commonAuditEventProps,
        timestamp: Math.floor(completedAt.getTime() / 1000),
        event_timestamp_ms: completedAt.getTime(),
        event_name: "AMC_ACTION_COMPLETED",
        client_id: request.session.claims.client_id,
        extensions: {
          // @ts-expect-error
          account_action: action.name,
          account_action_overall_success: action.success,
          account_action_error: action.success ? undefined : action.error,
          // @ts-expect-error
          amc_scope: request.session.claims.scope,
          "journey-type":
            reply.client?.journey_types_by_scope?.[
              request.session.claims.scope
            ],
        },
        user: {
          ...commonAuditEventProps.user,
          email: request.session.claims.email,
          user_id: request.session.claims.sub,
        },
      }),
    );
  }
};

export const completeJourneyActionSuccessfully = async <
  K extends keyof JourneyActions = never,
>(
  action: SuccessfulAction<JourneyActions[K]>,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const completedAt = new Date();
  await sendCompletedActionAuditEvent(completedAt, request, reply, {
    name: action.action,
    success: true,
  });
  completeInProgressAction(completedAt, { ...action, success: true }, request);
};

export const completeJourneyActionUnsuccessfully = async (
  action: FailedAction,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const completedAt = new Date();
  await sendCompletedActionAuditEvent(completedAt, request, reply, {
    name: action.action,
    success: false,
    error: action.error.description,
  });
  completeInProgressAction(completedAt, { ...action, success: false }, request);
};

export const completeAllJourneyActionsUnsuccessfully = async (
  error:
    | {
        [K in keyof typeof complexUnsuccessfulJourneyActionErrors]: (typeof complexUnsuccessfulJourneyActionErrors)[K] &
          (UnsuccessfulJourneyActionErrorExtras[K] extends undefined
            ? { extras?: never }
            : { extras: UnsuccessfulJourneyActionErrorExtras[K] });
      }[keyof typeof complexUnsuccessfulJourneyActionErrors]
    | {
        [K in keyof typeof simpleUnsuccessfulJourneyActionErrors]: (typeof simpleUnsuccessfulJourneyActionErrors)[K];
      }[keyof typeof simpleUnsuccessfulJourneyActionErrors],
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  assert.ok(
    !!request.session.journeyActions?.length,
    "There are no journey actions",
  );

  const completedAt = new Date();

  for (const journeyAction of request.session.journeyActions) {
    if (!("success" in journeyAction)) {
      const journeyActionName = Object.values(journeyActionNames).find(
        (name) => name === journeyAction.action,
      );

      assert.ok(journeyActionName, "Action not found");

      await sendCompletedActionAuditEvent(completedAt, request, reply, {
        name: journeyActionName,
        success: false,
        error: error.description,
      });
      completeInProgressAction(
        completedAt,
        { action: journeyActionName, error, success: false },
        request,
      );
    }
  }
};
