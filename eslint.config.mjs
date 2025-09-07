// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath, URL } from "node:url";
import vitestEslint from "@vitest/eslint-plugin";
import nodeEslint from "eslint-plugin-n";

// eslint-disable-next-line no-restricted-exports
export default tseslint.config(
  includeIgnoreFile(
    fileURLToPath(new URL(".gitignore", import.meta.url)),
    "Imported .gitignore patterns",
  ),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    plugins: { n: nodeEslint },
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
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    ...vitestEslint.configs.all,
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
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
