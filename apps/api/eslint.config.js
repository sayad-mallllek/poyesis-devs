import { config } from "@repo/eslint-config/base";

export default [
  ...config,
  { ignores: ["dist/**", ".dist-*/**", "src/generated/**", "storage/**"] },
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
