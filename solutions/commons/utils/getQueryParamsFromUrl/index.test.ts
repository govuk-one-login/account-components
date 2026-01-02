import { expect, it, describe } from "vitest";
import { getQueryParamsFromUrl } from "./index.js";

describe("getQueryParamsFromUrl", () => {
  it("returns searchParams for absolute HTTP URL", () => {
    const result = getQueryParamsFromUrl("http://example.com/path?param=value");

    expect(result.get("param")).toBe("value");
  });

  it("returns searchParams for absolute HTTPS URL", () => {
    const result = getQueryParamsFromUrl(
      "https://example.com/path?param=value",
    );

    expect(result.get("param")).toBe("value");
  });

  it("returns searchParams for relative URL", () => {
    const result = getQueryParamsFromUrl("/relative/path?param=value");

    expect(result.get("param")).toBe("value");
  });

  it("returns empty searchParams for URL without query parameters", () => {
    const result = getQueryParamsFromUrl("/path");

    expect(result.toString()).toBe("");
  });

  it("handles multiple query parameters", () => {
    const result = getQueryParamsFromUrl(
      "https://example.com/path?param1=value1&param2=value2",
    );

    expect(result.get("param1")).toBe("value1");
    expect(result.get("param2")).toBe("value2");
  });

  it("handles relative URL with multiple query parameters", () => {
    const result = getQueryParamsFromUrl("/path?param1=value1&param2=value2");

    expect(result.get("param1")).toBe("value1");
    expect(result.get("param2")).toBe("value2");
  });
});
