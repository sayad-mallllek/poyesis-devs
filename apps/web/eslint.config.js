import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [...nextJsConfig, { ignores: ["components/ui/**", ".next/**"] }];
