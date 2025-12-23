import { expect, it, describe, vi } from "vitest";
import { getAnalyticsSettings } from "./getAnalyticsSettings.js";

vi.mock(
  import("../../../../../commons/utils/resolveEnvVarToBool/index.js"),
  () => ({
    resolveEnvVarToBool: vi.fn(() => true),
  }),
);

describe("getAnalyticsSettings", () => {
  it("returns default analytics settings with required loggedInStatus", () => {
    const result = getAnalyticsSettings({ loggedInStatus: false });

    expect(result).toStrictEqual({
      enabled: true,
      taxonomyLevel1: "TODO",
      taxonomyLevel2: "TODO",
      taxonomyLevel3: "TODO",
      loggedInStatus: false,
    });
  });

  it("merges provided settings with defaults", () => {
    const result = getAnalyticsSettings({
      taxonomyLevel1: "Account",
      loggedInStatus: true,
    });

    expect(result).toStrictEqual({
      enabled: true,
      taxonomyLevel1: "Account",
      taxonomyLevel2: "TODO",
      taxonomyLevel3: "TODO",
      loggedInStatus: true,
    });
  });

  it("overrides all default values when provided", () => {
    const result = getAnalyticsSettings({
      enabled: false,
      taxonomyLevel1: "Custom1",
      taxonomyLevel2: "Custom2",
      taxonomyLevel3: "Custom3",
      isPageDataSensitive: false,
      loggedInStatus: true,
    });

    expect(result).toStrictEqual({
      enabled: false,
      taxonomyLevel1: "Custom1",
      taxonomyLevel2: "Custom2",
      taxonomyLevel3: "Custom3",
      isPageDataSensitive: false,
      loggedInStatus: true,
    });
  });

  it("handles partial overrides correctly", () => {
    const result = getAnalyticsSettings({
      enabled: false,
      taxonomyLevel2: "Delete",
      loggedInStatus: true,
    });

    expect(result).toStrictEqual({
      enabled: false,
      taxonomyLevel1: "TODO",
      taxonomyLevel2: "Delete",
      taxonomyLevel3: "TODO",
      loggedInStatus: true,
    });
  });
});
