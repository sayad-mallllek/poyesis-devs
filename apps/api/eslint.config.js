import { config } from "@repo/eslint-config/base";

export default [
  ...config,
  { ignores: ["dist/**", "src/generated/**"] },
  {
    languageOptions: {
      parserOptions: {
        babelOptions: {
          presets: ["@babel/preset-typescript"],
          plugins: [["@babel/plugin-syntax-decorators", { version: "legacy" }]],
        },
      },
    },
  },
];
