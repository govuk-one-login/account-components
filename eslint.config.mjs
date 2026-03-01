import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath } from "node:url";
import vitestEslint from "@vitest/eslint-plugin";
import nodeEslint from "eslint-plugin-n";
import playwrightEslint from "eslint-plugin-playwright";
import { defineConfig } from "eslint/config";
import dependEslint from "eslint-plugin-depend";
import * as path from "node:path";

const solutionImportRestriction = {
  meta: { type: "problem" },
  create(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const filePathAbsolute = context.filename;
        const isNodeModuleImport = !(
          importPath.startsWith("./") ||
          importPath.startsWith("../") ||
          importPath.startsWith("/")
        );

        if (!isNodeModuleImport) {
          if (path.isAbsolute(importPath)) {
            context.report({
              node,
              message: `Imports must use relative paths not absolute paths - "${importPath}"`,
            });
            return;
          }

          const importPathAbsolute = path.resolve(
            path.dirname(filePathAbsolute),
            importPath,
          );

          const importPathRelativeToThisFile = importPathAbsolute.replace(
            new RegExp(`^${RegExp.escape(import.meta.dirname)}`),
            "",
          );

          if (
            importPathRelativeToThisFile === "/solutions/config/schema/types.js"
          ) {
            return;
          }

          const filePathRelativeToThisFile = filePathAbsolute.replace(
            new RegExp(`^${RegExp.escape(import.meta.dirname)}`),
            "",
          );

          if (
            filePathRelativeToThisFile ===
            "/solutions/commons/utils/fastify/types.d.ts"
          ) {
            return;
          }

          const solutionRegex = /^\/solutions\/(.+?)\//;

          const importSolution =
            importPathRelativeToThisFile.match(solutionRegex)[1];
          const fileSolution =
            filePathRelativeToThisFile.match(solutionRegex)[1];

          if (importSolution !== "commons" && importSolution !== fileSolution) {
            context.report({
              node,
              message: `Cannot import from solution "${importSolution}" in solution "${fileSolution}". Only imports from "commons" or the same solution are allowed.`,
            });
            return;
          }
        }
      },
    };
  },
};

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
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
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
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@aws-lambda-powertools/logger"],
        },
      ],
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
  {
    files: ["solutions/**"],
    plugins: {
      "solution-imports": {
        rules: { "restrict-cross-solution": solutionImportRestriction },
      },
    },
    rules: { "solution-imports/restrict-cross-solution": "error" },
  },
);
