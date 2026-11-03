// Jest via next/jest (SWC transform, .env loading, next.config, CSS/font/image
// mocks). See node_modules/next/dist/docs/01-app/02-guides/testing/jest.md.
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const shared = {
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};

// Two projects: `.test.ts` logic tests run in Node; `.test.tsx` component
// tests run in jsdom with Testing Library's matchers (jest.setup.ts).
const unit = await createJestConfig({
  ...shared,
  displayName: "unit",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
})();

const components = await createJestConfig({
  ...shared,
  displayName: "components",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
})();

/** @type {import('jest').Config} */
const config = {
  projects: [unit, components],
  coverageProvider: "v8",
  collectCoverageFrom: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
};

export default config;
