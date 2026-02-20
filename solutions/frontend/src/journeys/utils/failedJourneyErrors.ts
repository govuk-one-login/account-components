export const failedJourneyErrors = {
  userSignedOut: {
    code: 1001,
    description: "UserSignedOut",
  },
  userAbortedJourney: {
    code: 1002,
    description: "UserAbortedJourney",
  },
} as const satisfies Record<
  string,
  {
    code: number;
    description: string;
  }
>;
