export const failedJourneyErrors = {
  // TODO remove this and its use before going live with SSAD
  tempErrorTODORemoveLater: {
    code: 1000,
    description: "TempErrorTODORemoveLater",
  },
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
