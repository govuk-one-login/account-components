import { expect, it, describe, vi } from "vitest";
import * as v from "valibot";
import { getSafeValibotIssues } from "./index.js";

const mockGetDotPath = vi.hoisted(() => vi.fn().mockReturnValue("mocked-path"));

vi.mock(import("valibot"), async (importOriginal) => ({
  ...(await importOriginal()),
  getDotPath: mockGetDotPath,
}));

describe("getSafeValibotIssues", () => {
  it("returns mapped issue with kind, type, expected and path from getDotPath", () => {
    mockGetDotPath.mockReturnValue("mocked.path");
    const result = v.safeParse(v.string(), 123);
    const issues = getSafeValibotIssues(result.issues!);

    expect(issues).toStrictEqual([
      {
        kind: "schema",
        type: "string",
        expected: "string",
        path: "mocked.path",
      },
    ]);
  });

  it("returns path as null when getDotPath returns null", () => {
    mockGetDotPath.mockReturnValue(null);
    const result = v.safeParse(v.string(), 123);
    const issues = getSafeValibotIssues(result.issues!);

    expect(issues).toStrictEqual([
      { kind: "schema", type: "string", expected: "string", path: null },
    ]);
  });

  it("calls getDotPath for each issue", () => {
    mockGetDotPath.mockReturnValue(null);
    const schema = v.object({ a: v.string(), b: v.number() });
    const result = v.safeParse(schema, { a: 1, b: "two" });
    getSafeValibotIssues(result.issues!);

    expect(mockGetDotPath).toHaveBeenCalledTimes(2);
  });

  it("maps multiple issues independently", () => {
    mockGetDotPath.mockReturnValueOnce("path.a").mockReturnValueOnce("path.b");
    const schema = v.object({ a: v.string(), b: v.number() });
    const result = v.safeParse(schema, { a: 1, b: "two" });
    const issues = getSafeValibotIssues(result.issues!);

    expect(issues).toStrictEqual([
      { kind: "schema", type: "string", expected: "string", path: "path.a" },
      { kind: "schema", type: "number", expected: "number", path: "path.b" },
    ]);
  });

  it("returns validation kind for pipe refinement failures", () => {
    mockGetDotPath.mockReturnValue(null);
    const schema = v.pipe(v.string(), v.email());
    const result = v.safeParse(schema, "not-an-email");
    const issues = getSafeValibotIssues(result.issues!);

    expect(issues).toStrictEqual([
      { kind: "validation", type: "email", expected: null, path: null },
    ]);
  });
});
