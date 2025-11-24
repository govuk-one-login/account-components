import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath } from "node:url";
import vitestEslint from "@vitest/eslint-plugin";
import nodeEslint from "eslint-plugin-n";
import playwrightEslint from "eslint-plugin-playwright";
import { defineConfig } from "eslint/config";
import dependEslint from "eslint-plugin-depend";

// eslint-disable-next-line no-restricted-exports
export default defineConfig(
  includeIgnoreFile(
    fileURLToPath(new URL(".gitignore", import.meta.url)),
    "Imported .gitignore patterns",
  ),
  // Do not lint the ESLint config itself
  { ignores: ["eslint.config.*"] },
  // Ensure JS files (including .mjs) use the default JS parser, not @typescript-eslint
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      parser: null,
      parserOptions: {
        projectService: false,
      },
    },
  },
  // Enable TypeScript project service only for TS files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        // Allow non-project files (e.g., tests/tools) to still be type-aware
        allowDefaultProject: true,
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  nodeEslint.configs["flat/recommended-script"],
  {
    plugins: { depend: dependEslint },
    extends: ["depend/flat/recommended"],
    rules: {
      "no-console": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
      "n/no-sync": "error",
      "n/no-unpublished-import": "off",
      "n/no-missing-import": [
        "error",
        {
          ignoreTypeImport: true,
        },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 0,
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "never",
        },
      ],
      "depend/ban-dependencies": [
        "error",
        {
          allowed: ["dotenv"],
        },
      ],
    },
  },
  {
    plugins: {
      // @ts-expect-error
      vitest: vitestEslint,
    },
    files: ["**/*.test.ts"],
    rules: {
      ...vitestEslint.configs.all.rules,
      "vitest/no-focused-tests": "error",
      "vitest/prefer-expect-assertions": "off",
      "vitest/require-mock-type-parameters": "off",
      "vitest/prefer-describe-function-title": "off",
      "vitest/no-hooks": "off",
      "vitest/max-expects": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/consistent-type-assertions": "off",
    },
  },
  {
    ...playwrightEslint.configs["flat/recommended"],
    files: ["solutions/integration-tests/tests/**"],
    rules: {
      ...playwrightEslint.configs["flat/recommended"].rules,
      "playwright/no-standalone-expect": "off",
    },
  },
);
