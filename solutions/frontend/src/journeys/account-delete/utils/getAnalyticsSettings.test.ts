import { describe, it, expect } from "vitest";
import type { FastifyReply } from "fastify";

import { getAnalyticsSettings } from "./getAnalyticsSettings.js";

describe("getAnalyticsSettings", () => {
  it("should return default taxonomy values when no settings provided", () => {
    const result = getAnalyticsSettings({});

    expect(result).toStrictEqual({
      taxonomyLevel1: "TODO",
      taxonomyLevel2: "TODO",
      taxonomyLevel3: "TODO",
    });
  });

  it("should merge provided settings with defaults", () => {
    const settings: Partial<NonNullable<FastifyReply["analytics"]>> = {
      taxonomyLevel1: "custom-level-1",
      taxonomyLevel3: "custom-level-3",
    };

    const result = getAnalyticsSettings(settings);

    expect(result).toStrictEqual({
      taxonomyLevel1: "custom-level-1",
      taxonomyLevel2: "TODO",
      taxonomyLevel3: "custom-level-3",
    });
  });

  it("should override all default values when all settings provided", () => {
    const settings: Partial<NonNullable<FastifyReply["analytics"]>> = {
      taxonomyLevel1: "level-1",
      taxonomyLevel2: "level-2",
      taxonomyLevel3: "level-3",
    };

    const result = getAnalyticsSettings(settings);

    expect(result).toStrictEqual({
      taxonomyLevel1: "level-1",
      taxonomyLevel2: "level-2",
      taxonomyLevel3: "level-3",
    });
  });
});
