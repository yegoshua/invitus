import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    // `**/` matters on this one. Rooted at the config directory, `.next/**`
    // covers the build at the repo root and nothing else — a build inside a
    // git worktree is a different `.next`, and ESLint walked straight into it.
    // That was 266 generated chunk files and ~23,800 findings, which made
    // `pnpm lint` exit 1 on a clean tree and hid every real finding in noise.
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Git worktrees are full copies of this repo. Even with their build output
    // excluded, linting one reports findings against a path that is not the
    // file anybody would edit.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
