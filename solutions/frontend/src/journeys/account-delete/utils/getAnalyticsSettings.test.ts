import { expect, it, describe } from "vitest";
import { getAnalyticsSettings } from "./getAnalyticsSettings.js";

describe("getAnalyticsSettings", () => {
  it("returns default analytics settings", () => {
    const result = getAnalyticsSettings({});

    expect(result).toStrictEqual({
      taxonomyLevel1: "TODO",
      taxonomyLevel2: "TODO",
      taxonomyLevel3: "TODO",
    });
  });

  it("merges provided settings with defaults", () => {
    const result = getAnalyticsSettings({
      taxonomyLevel1: "Account",
      loggedInStatus: true,
    });

    expect(result).toStrictEqual({
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
      taxonomyLevel1: "Custom1",
      taxonomyLevel2: "Custom2",
      taxonomyLevel3: "Custom3",
      enabled: false,
      isPageDataSensitive: false,
      loggedInStatus: true,
    });
  });

  it("handles partial overrides correctly", () => {
    const result = getAnalyticsSettings({
      enabled: false,
      taxonomyLevel2: "Delete",
    });

    expect(result).toStrictEqual({
      taxonomyLevel1: "TODO",
      taxonomyLevel2: "Delete",
      taxonomyLevel3: "TODO",
      enabled: false,
    });
  });
});
