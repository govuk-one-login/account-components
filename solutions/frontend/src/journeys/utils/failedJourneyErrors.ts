export const failedJourneyErrors = {
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
