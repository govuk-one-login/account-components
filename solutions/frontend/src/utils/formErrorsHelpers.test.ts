import { expect, it, describe } from "vitest";
import * as v from "valibot";
import {
  checkValueForFormErrors,
  getFormErrors,
  getFormErrorsList,
} from "./formErrorsHelpers.js";

describe("formErrorsHelpers", () => {
  describe("getFormErrors", () => {
    it("returns empty object for empty errors array", () => {
      const result = getFormErrors([]);

      expect(result).toStrictEqual({});
    });

    it("returns formatted error object for single error", () => {
      const errors = [{ msg: "Field is required", fieldId: "email" }];
      const result = getFormErrors(errors);

      expect(result).toStrictEqual({
        email: {
          text: "Field is required",
          href: "#email",
        },
      });
    });

    it("returns formatted error object for multiple errors", () => {
      const errors = [
        { msg: "Email is required", fieldId: "email" },
        { msg: "Password is too short", fieldId: "password" },
      ];
      const result = getFormErrors(errors);

      expect(result).toStrictEqual({
        email: {
          text: "Email is required",
          href: "#email",
        },
        password: {
          text: "Password is too short",
          href: "#password",
        },
      });
    });

    it("handles nested field IDs", () => {
      const errors = [
        { msg: "Invalid address", fieldId: "user.address.street" },
      ];
      const result = getFormErrors(errors);

      expect(result).toStrictEqual({
        "user.address.street": {
          text: "Invalid address",
          href: "#user.address.street",
        },
      });
    });
  });

  describe("getFormErrorsList", () => {
    it("returns empty array for empty errors object", () => {
      const errors = {};
      const result = getFormErrorsList(errors);

      expect(result).toStrictEqual([]);
    });

    it("returns array of error objects", () => {
      const errors = {
        email: {
          text: "Email is required",
          href: "#email" as const,
        },
        password: {
          text: "Password is too short",
          href: "#password" as const,
        },
      };
      const result = getFormErrorsList(errors);

      expect(result).toStrictEqual([
        { text: "Email is required", href: "#email" },
        { text: "Password is too short", href: "#password" },
      ]);
    });
  });

  describe("checkValueForFormErrors", () => {
    const testSchema = v.object({
      email: v.pipe(v.string("emailMustBeString"), v.email("emailMustBeEmail")),
      password: v.pipe(
        v.string("passwordMustBeString"),
        v.minLength(8, "passwordMustBe8Chars"),
      ),
    });

    it("returns success with parsed value for valid data", () => {
      const validData = {
        email: "test@example.com",
        password: "password123", // pragma: allowlist secret
      };
      const result = checkValueForFormErrors(validData, testSchema);

      expect(result.success).toBe(true);
      expect(result.parsedValue).toStrictEqual(validData);
      expect(result.formErrors).toBeUndefined();
    });

    it("returns formatted errors for invalid data", () => {
      const invalidData = {
        email: "invalid-email",
        password: "short", // pragma: allowlist secret
      };
      const result = checkValueForFormErrors(invalidData, testSchema);

      expect(result.success).toBe(false);
      expect(result.parsedValue).toBeUndefined();
      expect(result.formErrors).toBeDefined();
      expect(result.formErrors).toHaveProperty("email");
      expect(result.formErrors).toHaveProperty("password");
      expect(result.formErrors?.["email"]?.href).toBe("#email");
      expect(result.formErrors?.["email"]?.text).toBe("emailMustBeEmail");
      expect(result.formErrors?.["password"]?.href).toBe("#password");
      expect(result.formErrors?.["password"]?.text).toBe(
        "passwordMustBe8Chars",
      );
    });

    it("returns errors for missing required fields", () => {
      const incompleteData = {};
      const result = checkValueForFormErrors(incompleteData, testSchema);

      expect(result.success).toBe(false);
      expect(result.parsedValue).toBeUndefined();
      expect(result.formErrors).toBeDefined();
      expect(result.formErrors).toHaveProperty("email");
      expect(result.formErrors).toHaveProperty("password");
      expect(result.formErrors?.["email"]?.text).toBe(
        'Invalid key: Expected "email" but received undefined',
      );
      expect(result.formErrors?.["password"]?.text).toBe(
        'Invalid key: Expected "password" but received undefined',
      );
    });

    it("handles nested object validation", () => {
      const nestedSchema = v.object({
        user: v.object({
          profile: v.object({
            name: v.pipe(v.string(), v.minLength(1)),
          }),
        }),
      });

      const invalidNestedData = {
        user: {
          profile: {
            name: "",
          },
        },
      };

      const result = checkValueForFormErrors(invalidNestedData, nestedSchema);

      expect(result.success).toBe(false);
      expect(result.parsedValue).toBeUndefined();
      expect(result.formErrors).toBeDefined();
      expect(result.formErrors).toHaveProperty("user.profile.name");
      expect(result.formErrors?.["user.profile.name"]?.href).toBe(
        "#user.profile.name",
      );
      expect(result.formErrors?.["user.profile.name"]?.text).toBe(
        "Invalid length: Expected >=1 but received 0",
      );
    });

    it("handles array validation", () => {
      const arraySchema = v.object({
        items: v.array(v.pipe(v.string(), v.minLength(1))),
      });

      const invalidArrayData = {
        items: ["valid", "", "also-valid"],
      };

      const result = checkValueForFormErrors(invalidArrayData, arraySchema);

      expect(result.success).toBe(false);
      expect(result.parsedValue).toBeUndefined();
      expect(result.formErrors).toBeDefined();
      expect(Object.keys(result.formErrors!)).toContain("items.1");
      expect(result.formErrors?.["items.1"]?.text).toBe(
        "Invalid length: Expected >=1 but received 0",
      );
    });

    it("returns errors for null/undefined input with optional schema", () => {
      const optionalSchema = v.object({
        optionalField: v.optional(v.string()),
      });

      const result1 = checkValueForFormErrors(null, optionalSchema);
      const result2 = checkValueForFormErrors(undefined, optionalSchema);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });
});
