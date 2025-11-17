import { Scope } from "../../../commons/utils/authorize/getClaimsSchema.js";

export const paths = {
  authorizeError: "/authorize-error",
  startSession: "/start-session",
  journeys: {
    [Scope.accountDelete]: {
      TODO: "/TODO",
    },
  },
} as const;

export type JourneyPath =
  (typeof paths.journeys)[Scope][keyof (typeof paths.journeys)[Scope]];
