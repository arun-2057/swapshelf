const jestConfig = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.js"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { esModuleInterop: true } }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  verbose: false,
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "!src/lib/logger.ts",
    "!src/lib/rate-limit.ts",
  ],
};

export default jestConfig;
