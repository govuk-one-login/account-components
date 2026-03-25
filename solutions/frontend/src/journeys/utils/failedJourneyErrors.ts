export const failedJourneyErrors = {
  userSignedOut: {
    code: 1001,
    description: "UserSignedOut",
  },
  userAbortedJourney: {
    code: 1002,
    description: "UserAbortedJourney",
  },
  userBackedOutOfJourney: {
    code: 1003,
    description: "UserBackedOutOfJourney",
  },
} as const satisfies Record<
  string,
  {
    code: number;
    description: string;
  }
>;
