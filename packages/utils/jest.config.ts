import type { JestConfigWithTsJest } from "ts-jest";
// Sync object
const config: JestConfigWithTsJest = {
  verbose: true,
  testMatch: ["Specs/*Spec.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

export default config;
