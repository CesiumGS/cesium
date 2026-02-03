/**
 * TypeScript declarations for Vitest global APIs.
 *
 * This file enables TypeScript intellisense for Vitest's global test APIs
 * when using `globals: true` in vitest.config.ts
 */

/// <reference types="vitest/globals" />

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  // Extend Vitest's Assertion interface with jest-dom matchers
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}
