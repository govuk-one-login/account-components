export const failedJourneyErrors = {
  userSignedOut: {
    code: 1001,
    description: "UserSignedOut",
  },
} as const satisfies Record<
  string,
  {
    code: number;
    description: string;
  }
>;
