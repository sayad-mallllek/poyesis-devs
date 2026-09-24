import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  // Flat config only lints *.js by default; opt TypeScript sources in.
  { files: ["**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"] },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-typescript"],
        },
      },
    },
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    files: ["**/*.tsx"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-typescript"],
          // Babel 8 no longer infers JSX from the .tsx extension here.
          parserOpts: { plugins: ["jsx"] },
        },
      },
    },
  },
  {
    // The TypeScript compiler owns these checks (noUnusedLocals/Parameters);
    // the core rules don't understand types and only produce false positives.
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: { "no-undef": "off", "no-unused-vars": "off" },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**"],
  },
];
