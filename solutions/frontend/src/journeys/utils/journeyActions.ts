import type { FastifyReply, FastifyRequest } from "fastify";
import {
  getCommonAuditEventProps,
  sendAuditEvent,
} from "../../../../commons/utils/auditEvents/index.js";
import { createEvent } from "@govuk-one-login/event-catalogue-utils";
import assert from "node:assert";

export const journeyActionNames = {
  testingJourneyAction: "testing-journey-action",
  accountDelete: "account-delete",
  passkeyCreate: "passkey-create",
} as const;
export type JourneyActionName =
  (typeof journeyActionNames)[keyof typeof journeyActionNames];

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
  Name extends JourneyActionName,
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

type InProgressAction<T extends JourneyAction<JourneyActionName>> = Exclude<
  T,
  { success: boolean }
>;

type SuccessfulAction<T extends JourneyAction<JourneyActionName>> = Omit<
  Extract<T, { success: true }>,
  "timestamp" | "success"
>;

type FailedAction = Omit<
  Extract<JourneyActions[keyof JourneyActions], { success: false }>,
  "timestamp" | "success"
>;

export const startJourneyAction = async <
  K extends keyof JourneyActions = never,
>(
  action: InProgressAction<JourneyActions[K]>,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  request.session.journeyActions ??= [];

  const inProgressAction = request.session.journeyActions.find(
    (journeyAction) =>
      journeyAction.action === action.action && !("success" in journeyAction),
  );

  if (!inProgressAction) {
    request.session.journeyActions.push(action);

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
            // @ts-expect-error - type in event catalogue seems to be incorrect
            account_action: action.action,
            // @ts-expect-error - scope in event catalogue does not accommodate testing-journey scope
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

const updateInProgressAction = (
  action: Omit<JourneyAction<JourneyActionName>, "timestamp"> & {
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

  request.session.journeyActions[index] = { ...action, timestamp: Date.now() };
};

const sendCompletedActionAuditEvent = async (
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
        event_name: "AMC_ACTION_COMPLETED",
        client_id: request.session.claims.client_id,
        extensions: {
          // @ts-expect-error - type in event catalogue seems to be incorrect
          account_action: action.name,
          account_action_overall_success: action.success,
          account_action_error: action.success ? undefined : action.error,
          // @ts-expect-error - scope in event catalogue does not accommodate testing-journey scope
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
  await sendCompletedActionAuditEvent(request, reply, {
    name: action.action,
    success: true,
  });
  updateInProgressAction({ ...action, success: true }, request);
};

export const completeJourneyActionUnsuccessfully = async (
  action: FailedAction,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  await sendCompletedActionAuditEvent(request, reply, {
    name: action.action,
    success: false,
    error: action.error.description,
  });
  updateInProgressAction({ ...action, success: false }, request);
};
