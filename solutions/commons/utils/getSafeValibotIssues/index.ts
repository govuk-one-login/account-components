import * as v from "valibot";

export const getSafeValibotIssues = (
  issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]],
) => {
  return issues.map((issue) => ({
    kind: issue.kind,
    type: issue.type,
    expected: issue.expected,
    path: v.getDotPath(issue),
  }));
};
